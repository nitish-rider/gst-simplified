import * as XLSX from "xlsx";

type RawRow = Record<string, string | number | undefined>;
type ProcessedRow = { gstNumber: string; name: string; totalTax: number };
type B2BRow = { GST: string; tax: number };
type AggregatedB2BRow = { GST: string; totalTax: number };

async function readExcelFile(file: File) {
    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('No sheets found in the workbook');
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error('Could not find worksheet');
        const rawData = XLSX.utils.sheet_to_json<RawRow>(worksheet, {header: 'A'});
        if (rawData.length < 3) throw new Error('Excel file does not have enough rows');
        const data: ProcessedRow[] = rawData.slice(2).map((row) => {
            const gstNumber = (row['C'] || '').toString().trim();
            const name = (row['B'] || '').toString().trim();
            const tax2 = typeof row['G'] === 'number' ? row['G'] : Number(row['G']) || 0;
            const tax3 = typeof row['J'] === 'number' ? row['J'] : Number(row['J']) || 0;
            const tax4 = typeof row['M'] === 'number' ? row['M'] : Number(row['M']) || 0;
            const totalTax = tax2 + tax3 + tax4;
            return {
                gstNumber,
                name,
                totalTax: Number(totalTax.toFixed(2))
            };
        }).filter(row => row.gstNumber)
            .sort((a, b) => a.gstNumber.localeCompare(b.gstNumber));
        return {
            success: true,
            data,
            sheetName
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unknown error occurred'
        };
    }
}

async function readB2BSheet(file: File) {
    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), {type: 'array'});
        if (!workbook.SheetNames.includes("B2B")) throw new Error("B2B sheet not found in the workbook");
        const worksheet = workbook.Sheets["B2B"];
        if (!worksheet) throw new Error("Could not read B2B worksheet");
        const data = XLSX.utils.sheet_to_json<RawRow>(worksheet, {header: "A"});
        if (data.length === 0) throw new Error("Excel file is empty");
        const firstRow = data[0];
        const kValue = firstRow?.["K"];
        if (kValue === undefined || (typeof kValue !== "number" && isNaN(Number(kValue)))) {
            throw new Error("Invalid GST file format: Column K (Tax Amount) must contain numbers");
        }
        const columnsToKeep: Array<"A" | "K"> = ["A", "K"];
        const customHeaders: Record<"A" | "K", string> = {A: "GST", K: "tax"};
        const headers = customHeaders;
        const rows: B2BRow[] = data.map((row) => {
            const filteredRow: Partial<B2BRow> = {};
            columnsToKeep.forEach((col) => {
                const value = row[col];
                if (value !== undefined && (col === "A" || col === "K")) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    filteredRow[customHeaders[col] as keyof B2BRow] =
                        col === "K"
                            ? (typeof value === "number" ? value : Number(value) || 0) as number
                            : (typeof value === "string" ? value : value?.toString() ?? '') as string;
                }
            });
            return filteredRow as B2BRow;
        });
        const gstTaxMap = new Map<string, number>();
        rows.forEach((row) => {
            const gst = row.GST?.toString().trim();
            const tax = row.tax || 0;
            if (gst) {
                gstTaxMap.set(gst, (gstTaxMap.get(gst) || 0) + tax);
            }
        });
        const aggregatedData: AggregatedB2BRow[] = Array.from(gstTaxMap.entries()).map(
            ([gst, totalTax]) => ({
                GST: gst,
                totalTax: Number(totalTax.toFixed(2)),
            }),
        );
        aggregatedData.sort((a, b) => a.GST.localeCompare(b.GST));
        return {
            success: true,
            headers,
            rawData: rows,
            aggregatedData,
            uniqueGSTCount: aggregatedData.length,
            totalTaxSum: Number(
                aggregatedData.reduce((sum, item) => sum + item.totalTax, 0).toFixed(2),
            ),
            keptColumns: columnsToKeep,
        };
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "An unknown error occurred",
        };
    }
}

function writeComparisonToExcel(
    matching: Array<{ gst: string, name: string, b2bTax: number, resultTax: number }>,
    onlyInB2b: Array<{ gst: string, tax: number }>,
    onlyInResult: Array<{ gst: string, name: string, tax: number }>,
) {
    const workbook = XLSX.utils.book_new();
    const matchingData = [
        ['GST Number', 'Name', 'B2B Tax', 'Result Tax', 'Difference'],
        ...matching.map(item => [
            item.gst,
            item.name,
            item.b2bTax,
            item.resultTax,
            Number((item.b2bTax - item.resultTax).toFixed(2))
        ])
    ];
    const matchingSheet = XLSX.utils.aoa_to_sheet(matchingData);
    XLSX.utils.book_append_sheet(workbook, matchingSheet, 'Matching GST');
    const b2bOnlyData = [
        ['GST Number', 'Tax'],
        ...onlyInB2b.map(item => [item.gst, item.tax])
    ];
    const b2bOnlySheet = XLSX.utils.aoa_to_sheet(b2bOnlyData);
    XLSX.utils.book_append_sheet(workbook, b2bOnlySheet, 'Only in B2B');
    const resultOnlyData = [
        ['GST Number', 'Name', 'Tax'],
        ...onlyInResult.map(item => [item.gst, item.name, item.tax])
    ];
    const resultOnlySheet = XLSX.utils.aoa_to_sheet(resultOnlyData);
    XLSX.utils.book_append_sheet(workbook, resultOnlySheet, 'Only in Result');
    return workbook;
}

export async function getGstFile(reckonFile: File, gstFile: File) {
    const result = await readExcelFile(reckonFile);
    const b2bData = await readB2BSheet(gstFile);
    if (b2bData.success && result.success) {
        const b2bMap = new Map(
            (b2bData.aggregatedData || []).map(item => [item.GST.trim(), item.totalTax])
        );
        const resultMap = new Map(
            (result.data || []).map(item => [item.gstNumber.trim(), {tax: item.totalTax, name: item.name}])
        );
        const matching: Array<{ gst: string, name: string, b2bTax: number, resultTax: number }> = [];
        const onlyInB2b: Array<{ gst: string, tax: number }> = [];
        const onlyInResult: Array<{ gst: string, name: string, tax: number }> = [];
        b2bMap.forEach((tax, gst) => {
            const resultData = resultMap.get(gst);
            if (resultData !== undefined) {
                matching.push({
                    gst,
                    name: resultData.name,
                    b2bTax: tax,
                    resultTax: resultData.tax
                });
            } else {
                onlyInB2b.push({gst, tax});
            }
        });
        resultMap.forEach((data, gst) => {
            if (!b2bMap.has(gst)) {
                onlyInResult.push({gst, name: data.name, tax: data.tax});
            }
        });
        const summary = {
            totalB2B: b2bMap.size,
            totalResult: resultMap.size,
            matchingCount: matching.length,
            onlyB2BCount: onlyInB2b.length,
            onlyResultCount: onlyInResult.length
        };
        const workbook = writeComparisonToExcel(
            matching,
            onlyInB2b,
            onlyInResult,
        );
        return {
            success: true,
            workbook,
            summary: {
                totalB2B: summary.totalB2B,
                totalResult: summary.totalResult,
                matchingCount: summary.matchingCount,
                onlyB2BCount: summary.onlyB2BCount,
                onlyResultCount: summary.onlyResultCount
            }
        };
    } else {
        return {
            success: false,
            error: !result.success ? result.error : b2bData.error
        };
    }
}