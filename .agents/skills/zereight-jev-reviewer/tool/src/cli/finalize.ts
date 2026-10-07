// Validates an agent's dispositions against a saved report. Usage: finalize.ts <submission.json>
import { readFileSync } from "node:fs";
import { finalizeReview, type Submission } from "../review/finalize.ts";

const submission = JSON.parse(readFileSync(process.argv[2], "utf8")) as Submission;
console.log(JSON.stringify(finalizeReview(submission), null, 2));
