import * as XLSX from "xlsx";
import {getGstFile} from "@/lib/gst";

export async function processGSTB2BFiles(reckonFile: File, gstFile: File) {
    try {
        const result = await getGstFile(reckonFile, gstFile);

        if (!result || !result.success || !result.workbook) {
            throw new Error(result?.error || "Failed to process GST files");
        }

        XLSX.writeFile(result.workbook, "GST_B2B_Reconciliation_Report.xlsx");

        return {
            success: true,
            summary: result.summary,
        };
    } catch (error) {
        console.error("Error processing GST B2B files:", error);
        throw error;
    }
}

export async function processBankFiles(reckonFile: File, bankFile: File) {
    try {
        const reckonData = await readExcelFile(reckonFile);
        const bankData = await readExcelFile(bankFile);

        const processedData = processBankData(reckonData, bankData);

        downloadExcelFile(processedData, "Bank_Reconciliation_Report.xlsx");
    } catch (error) {
        console.error("Error processing bank files:", error);
        throw error;
    }
}

async function readExcelFile(file: File): Promise<string[][]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, {type: "array"});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                resolve(jsonData as string[][]);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
    });
}

function processBankData(reckonData: string[][], bankData: string[][]): string[][] {
    const headers = ["Date", "Description", "Reckon Amount", "Bank Amount", "Difference", "Status"];
    const processedRows: string[][] = [];

    for (let i = 1; i < Math.min(reckonData.length, bankData.length); i++) {
        const reckonRow = reckonData[i] || [];
        const bankRow = bankData[i] || [];

        processedRows.push([
            reckonRow[0] || "",
            reckonRow[1] || "",
            reckonRow[2]?.toString() || "0",
            bankRow[2]?.toString() || "0",
            ((+reckonRow[2] || 0) - (+bankRow[2] || 0)).toFixed(2),
            Math.abs((+reckonRow[2] || 0) - (+bankRow[2] || 0)) < 0.01 ? "Matched" : "Mismatch",
        ]);
    }

    return [headers, ...processedRows];
}

function downloadExcelFile(data: string[][], filename: string) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation Report");

    XLSX.writeFile(workbook, filename);
}