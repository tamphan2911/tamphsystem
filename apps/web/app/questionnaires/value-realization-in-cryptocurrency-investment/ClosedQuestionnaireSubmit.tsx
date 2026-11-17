"use client";

import { useRef } from "react";
import { LockKeyhole, Send, X } from "lucide-react";
import { closureMessage } from "./content";
import styles from "./questionnaire.module.css";

export function ClosedQuestionnaireSubmit() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      {/* Keep the closed control focusable so click/keyboard attempts can explain why it cannot submit. */}
      <button
        type="button"
        aria-disabled="true"
        aria-haspopup="dialog"
        aria-describedby="collection-closed-en collection-closed-vi"
        className={styles.submitButton}
        onClick={() => dialog.current?.showModal()}
      >
        <Send size={18} aria-hidden="true" />
        <span>
          Submit answers <span lang="vi">/ Gửi câu trả lời</span>
        </span>
      </button>
      <dialog
        ref={dialog}
        className={styles.closedDialog}
        aria-labelledby="closed-dialog-title"
        aria-describedby="closed-dialog-en closed-dialog-vi"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className={styles.dialogHeader}>
          <LockKeyhole size={22} aria-hidden="true" />
          <h2 id="closed-dialog-title">
            This questionnaire is closed
            <span lang="vi">Khảo sát đã kết thúc</span>
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => dialog.current?.close()}
            aria-label="Close / Đóng"
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.dialogBody}>
          <p id="closed-dialog-en">{closureMessage.en}</p>
          <p id="closed-dialog-vi" lang="vi" className={styles.translation}>
            {closureMessage.vi}
          </p>
        </div>
        <div className={styles.dialogFooter}>
          <button
            type="button"
            className={styles.dismissButton}
            onClick={() => dialog.current?.close()}
          >
            Understood <span lang="vi">/ Đã hiểu</span>
          </button>
        </div>
      </dialog>
    </>
  );
}
