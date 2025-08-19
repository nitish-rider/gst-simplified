import * as XLSX from "xlsx";
import {getGstFile} from "@/lib/gst";
import {processBankFile} from "./bank";

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
        const result = await processBankFile(reckonFile, bankFile);

        if (!result || !result.success || !result.workbook) {
            throw new Error(result?.error || "Failed to process bank files");
        }

        XLSX.writeFile(result.workbook, "Bank_Reconciliation_Report.xlsx");

        return {
            success: true,
            message: "Bank reconciliation report generated successfully"
        };
    } catch (error) {
        console.error("Error processing bank files:", error);
        throw error;
    }
}