import * as XLSX from "xlsx";

interface BankData {
    date: string;
    description: string;
    amount: number;
    type: string;
}

export function formatReckonFile(data: string[][]) {
    const rowsWithoutHeader = data.slice(8);

    // Filter out rows with empty dates first (date is in first column)
    const rowsWithDates = rowsWithoutHeader.filter(row => row[0] && row[0].trim() !== '');

    // Then filter columns from remaining rows
    const filteredRows = rowsWithDates.map(row => {
        return row.filter((_, index) => index !== 0 && index !== 5 && index !== 6);
    });

    // Add headers as first row
    return [
        ['Date', 'Name', 'Debit', 'Credit'],
        ...filteredRows
    ];
}

export function formatBankFile(data: string[][]) {
    // Format bank file data starting from first row
    const rowsWithoutHeader = data.slice(17, -38);

    // Filter columns from each row
    const filteredRows = rowsWithoutHeader.map(row => {
        return row.filter((_, index) => index !== 0 && index !== 1 && index !== 2 && index !== 4 && index !== 5 && index !== 9);
    });

    // Add headers as first row
    return [
        ['Date', 'Name', 'Withdrawal', 'Deposit'],
        ...filteredRows
    ];
}

function findMismatches(reckonData: string[][], bankData: string[][]) {
    // Skip headers
    const reckonEntries = reckonData.slice(1);
    const bankEntries = bankData.slice(1);

    // Extract debit and credit amounts from Reckon
    const reckonDebits = reckonEntries.map(row => ({
        date: new Date(row[0]),
        name: row[1],
        amount: parseInt(String(row[2]).replace(/,/g, '')) || 0 // Debit column
    })).filter(entry => entry.amount > 0);

    const reckonCredits = reckonEntries.map(row => ({
        date: new Date(row[0]),
        name: row[1],
        amount: parseInt(String(row[3]).replace(/,/g, '')) || 0 // Credit column
    })).filter(entry => entry.amount > 0);

    // Extract withdrawal and deposit amounts from Bank
    const bankWithdrawals = bankEntries.map(row => ({
        date: new Date(row[0]),
        name: row[1],
        amount: parseInt(String(row[2]).replace(/,/g, '')) || 0 // Withdrawal column
    })).filter(entry => entry.amount > 0);

    const bankDeposits = bankEntries.map(row => ({
        date: new Date(row[0]),
        name: row[1],
        amount: parseInt(String(row[3]).replace(/,/g, '')) || 0 // Deposit column
    })).filter(entry => entry.amount > 0);

    // Track matched entries
    const matchedReckonDebitIndices = new Set();
    const matchedReckonCreditIndices = new Set();
    const matchedBankDepositIndices = new Set();
    const matchedBankWithdrawalIndices = new Set();

    // Helper function to calculate similarity between two strings
    function stringSimilarity(str1: string, str2: string): number {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        const len1 = str1.length;
        const len2 = str2.length;
        const maxDist = Math.max(len1, len2);
        let matches = 0;
        for (let i = 0; i < len1; i++) {
            for (let j = 0; j < len2; j++) {
                if (str1[i] === str2[j]) {
                    matches++;
                    break;
                }
            }
        }
        return matches / maxDist;
    }

    // Helper function to calculate match score
    function calculateMatchScore(reckonEntry: any, bankEntry: any): number {
        // Start with amount match (required)
        if (Math.abs(reckonEntry.amount - bankEntry.amount) >= 0.01) {
            return -1;
        }

        let score = 1;

        // Add date proximity score (0-1)
        const daysDiff = Math.abs(reckonEntry.date.getTime() - bankEntry.date.getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 1 - daysDiff / 7); // Full point if same day, decreasing over a week

        // Add description similarity score (0-1)
        const similarity = stringSimilarity(reckonEntry.name, bankEntry.name);
        score += similarity;

        return score;
    }

    // Match Reckon Debits with Bank Deposits
    const debitMatches: Array<{reckonIndex: number, bankIndex: number, score: number}> = [];
    reckonDebits.forEach((reckonEntry, reckonIndex) => {
        bankDeposits.forEach((bankEntry, bankIndex) => {
            const score = calculateMatchScore(reckonEntry, bankEntry);
            if (score >= 0) {
                debitMatches.push({ reckonIndex, bankIndex, score });
            }
        });
    });

    // Sort matches by score and apply them
    debitMatches.sort((a, b) => b.score - a.score);
    debitMatches.forEach(match => {
        if (!matchedReckonDebitIndices.has(match.reckonIndex) && 
            !matchedBankDepositIndices.has(match.bankIndex)) {
            matchedReckonDebitIndices.add(match.reckonIndex);
            matchedBankDepositIndices.add(match.bankIndex);
        }
    });

    // Match Reckon Credits with Bank Withdrawals
    const creditMatches: Array<{reckonIndex: number, bankIndex: number, score: number}> = [];
    reckonCredits.forEach((reckonEntry, reckonIndex) => {
        bankWithdrawals.forEach((bankEntry, bankIndex) => {
            const score = calculateMatchScore(reckonEntry, bankEntry);
            if (score >= 0) {
                creditMatches.push({ reckonIndex, bankIndex, score });
            }
        });
    });

    // Sort matches by score and apply them
    creditMatches.sort((a, b) => b.score - a.score);
    creditMatches.forEach(match => {
        if (!matchedReckonCreditIndices.has(match.reckonIndex) && 
            !matchedBankWithdrawalIndices.has(match.bankIndex)) {
            matchedReckonCreditIndices.add(match.reckonIndex);
            matchedBankWithdrawalIndices.add(match.bankIndex);
        }
    });

    // Get unmatched entries
    const unmatchedReckonDebits = reckonDebits.filter((_, index) => !matchedReckonDebitIndices.has(index));
    const unmatchedReckonCredits = reckonCredits.filter((_, index) => !matchedReckonCreditIndices.has(index));
    const unmatchedBankDeposits = bankDeposits.filter((_, index) => !matchedBankDepositIndices.has(index));
    const unmatchedBankWithdrawals = bankWithdrawals.filter((_, index) => !matchedBankWithdrawalIndices.has(index));

    // Log results
    console.log("\n=== Unmatched Entries ===");

    console.log("\nReckon Debits without matching Bank Deposits:");
    unmatchedReckonDebits.forEach(entry => {
        console.log(`Date: ${entry.date}, Name: ${entry.name}, Amount: ${entry.amount}`);
    });

    console.log("\nReckon Credits without matching Bank Withdrawals:");
    unmatchedReckonCredits.forEach(entry => {
        console.log(`Date: ${entry.date}, Name: ${entry.name}, Amount: ${entry.amount}`);
    });

    console.log("\nBank Deposits without matching Reckon Debits:");
    unmatchedBankDeposits.forEach(entry => {
        console.log(`Date: ${entry.date}, Name: ${entry.name}, Amount: ${entry.amount}`);
    });

    console.log("\nBank Withdrawals without matching Reckon Credits:");
    unmatchedBankWithdrawals.forEach(entry => {
        console.log(`Date: ${entry.date}, Name: ${entry.name}, Amount: ${entry.amount}`);
    });

    return {
        unmatchedReckonDebits,
        unmatchedReckonCredits,
        unmatchedBankDeposits,
        unmatchedBankWithdrawals
    };
}

export function printFormattedData(data: BankData[], title: string) {
    console.log(`\n=== ${title} ===`);
    console.log("Date | Description | Amount | Type");
    console.log("-".repeat(80));

    data.forEach(row => {
        console.log(`${row.date} | ${row.description} | ₹${row.amount.toFixed(2)} | ${row.type}`);
    });

    // Print summary
    const totalAmount = data.reduce((sum, row) => sum + row.amount, 0);
    console.log("-".repeat(80));
    console.log(`Total Entries: ${data.length}`);
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
}

async function readExcelFile(file: File): Promise<string[][]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), {type: 'array'});
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, {header: 1}) as string[][];
}

export const processBankFile = async (reckonFile: File, bankFile: File) => {
    try {
        const reckonData = await readExcelFile(reckonFile);
        const bankData = await readExcelFile(bankFile);

        const formattedReckonData = formatReckonFile(reckonData);
        const formattedBankData = formatBankFile(bankData);

        // Find mismatches
        const mismatches = findMismatches(formattedReckonData, formattedBankData);

        // Create workbook with two sheets
        const workbook = XLSX.utils.book_new();

        const mismatchSheet = XLSX.utils.aoa_to_sheet([['Date', 'Name', 'Amount'],
            ...mismatches.unmatchedReckonDebits.map(entry => [entry.date, entry.name, entry.amount]),]);
        XLSX.utils.book_append_sheet(workbook, mismatchSheet, 'Unmatched Reckon Debits');

        const mismatchSheet2 = XLSX.utils.aoa_to_sheet([['Date', 'Name', 'Amount'],
            ...mismatches.unmatchedReckonCredits.map(entry => [entry.date, entry.name, entry.amount]),]);
        XLSX.utils.book_append_sheet(workbook, mismatchSheet2, 'Unmatched Reckon Credits');

        const mismatchSheet3 = XLSX.utils.aoa_to_sheet([['Date', 'Name', 'Amount'],
            ...mismatches.unmatchedBankDeposits.map(entry => [entry.date, entry.name, entry.amount]),]);
        XLSX.utils.book_append_sheet(workbook, mismatchSheet3, 'Unmatched Bank Deposits');

        const mismatchSheet4 = XLSX.utils.aoa_to_sheet([['Date', 'Name', 'Amount'],
            ...mismatches.unmatchedBankWithdrawals.map(entry => [entry.date, entry.name, entry.amount]),]);
        XLSX.utils.book_append_sheet(workbook, mismatchSheet4, 'Unmatched Bank Withdrawals');


        return {
            success: true,
            workbook,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unknown error occurred'
        };
    }
}