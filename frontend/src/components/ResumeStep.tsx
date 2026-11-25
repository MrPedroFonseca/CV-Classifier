import type { ChangeEvent, RefObject } from "react";
import { StepHeading } from "./StepHeading";
import "./ResumeStep.css";

interface ResumeStepProps {
  resumeSource: string;
  resume: string;
  extractingResume: boolean;
  fileInput: RefObject<HTMLInputElement | null>;
  onResumeSourceChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onPrepareResume: () => void;
  onPdfUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onChooseFile: () => void;
  onClearResume: () => void;
  onReviewedResumeChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

// Collects resume text or PDF and lets the user review the exact text to send.
export function ResumeStep({
  resumeSource,
  resume,
  extractingResume,
  fileInput,
  onResumeSourceChange,
  onPrepareResume,
  onPdfUpload,
  onChooseFile,
  onClearResume,
  onReviewedResumeChange
}: ResumeStepProps) {
  return (
    <section className="panel resume-panel">
      <StepHeading
        number={1}
        title="Your resume"
        description="Prepare it once. It stays in this browser."
      />

      <label className="field-label" htmlFor="resume-source">
        Paste resume text
      </label>
      <textarea
        id="resume-source"
        className="text-input resume-source"
        value={resumeSource}
        maxLength={10_000}
        onChange={onResumeSourceChange}
        placeholder="Paste your resume text here..."
        rows={5}
      />
      <div className="resume-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onPrepareResume}
        >
          Remove contacts and review
        </button>
        <span className="character-count">
          {resumeSource.length.toLocaleString()} / 10,000
        </span>
      </div>

      <div className="upload-row">
        <span className="or-divider">or</span>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/pdf,.pdf"
          onChange={onPdfUpload}
          aria-label="Upload resume PDF"
        />
        <button
          className="button button-upload"
          type="button"
          onClick={onChooseFile}
          disabled={extractingResume}
        >
          {extractingResume ? "Extracting PDF..." : "Upload a PDF"}
        </button>
        <span className="upload-hint">PDF, up to 2 MB</span>
      </div>

      {resume && (
        <div className="review-block">
          <div className="review-heading">
            <label className="field-label" htmlFor="resume-reviewed">
              Reviewed text sent for analysis
            </label>
            <button
              className="text-button"
              type="button"
              onClick={onClearResume}
            >
              Remove resume
            </button>
          </div>
          <textarea
            id="resume-reviewed"
            className="text-input reviewed-resume"
            value={resume}
            maxLength={10_000}
            onChange={onReviewedResumeChange}
            rows={7}
          />
          <span className="character-count right-count">
            {resume.length.toLocaleString()} / 10,000
          </span>
        </div>
      )}
    </section>
  );
}
