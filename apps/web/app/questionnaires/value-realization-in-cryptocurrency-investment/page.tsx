import type { Metadata } from "next";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { ClosedQuestionnaireSubmit } from "./ClosedQuestionnaireSubmit";
import {
  backgroundQuestions,
  closureMessage,
  collectionPeriod,
  participationQuestions,
  ratingGroups,
  ratingScale,
  type BackgroundQuestion,
} from "./content";
import styles from "./questionnaire.module.css";

export const metadata: Metadata = {
  title: "Value Realization in Cryptocurrency Investment | Questionnaire",
  description:
    "English and Vietnamese research questionnaire. Data collection ran from January to March 2026 and is now closed.",
  icons: { icon: "/research-favicon.png", shortcut: "/research-favicon.png" },
};

function BackgroundField({ question }: { question: BackgroundQuestion }) {
  return (
    <fieldset disabled className={styles.backgroundField}>
      <legend>
        <span className={styles.questionTitle}>
          {question.id.startsWith("D") && (
            <span className={styles.questionCode}>{question.id}.</span>
          )}
          {question.en}
        </span>
        <span lang="vi" className={styles.translation}>
          {question.vi}
        </span>
      </legend>
      <div className={styles.backgroundOptions}>
        {question.options.map((option, index) => (
          <label key={option.en} className={styles.backgroundOption}>
            <input
              type="checkbox"
              name={question.id}
              value={index + 1}
              checked={false}
              readOnly
              disabled
            />
            <span>
              <span>{option.en}</span>
              <span lang="vi" className={styles.translation}>
                {option.vi}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function CryptocurrencyQuestionnairePage() {
  return (
    <main className={styles.page}>
      <article className={styles.content} aria-labelledby="questionnaire-title">
        <header className={styles.heading}>
          <p className={styles.eyebrow}>
            Research questionnaire <span aria-hidden="true">/</span>{" "}
            <span lang="vi">Bảng hỏi nghiên cứu</span>
          </p>
          <h1 id="questionnaire-title">
            Value Realization in Cryptocurrency Investment
          </h1>
          <p lang="vi" className={styles.subtitle}>
            Hiện thực hóa giá trị trong đầu tư tiền mã hóa
          </p>
        </header>

        <aside
          className={styles.closedNotice}
          aria-labelledby="collection-closed-title"
        >
          <LockKeyhole size={22} aria-hidden="true" />
          <div>
            <h2 id="collection-closed-title">
              Responses closed <span aria-hidden="true">/</span>{" "}
              <span lang="vi">Đã ngừng nhận câu trả lời</span>
            </h2>
            <p id="collection-closed-en">{closureMessage.en}</p>
            <p id="collection-closed-vi" lang="vi">
              {closureMessage.vi}
            </p>
          </div>
        </aside>

        <div className={styles.collectionPeriod}>
          <CalendarDays size={18} aria-hidden="true" />
          <span>{collectionPeriod.en}</span>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <span lang="vi">{collectionPeriod.vi}</span>
        </div>

        <div className={styles.introduction}>
          <p>
            This questionnaire asks about your experiences, perceptions and
            intention to continue investing in cryptocurrencies. There are no
            right or wrong answers. Participation is voluntary; you may leave
            any question unanswered or stop at any time. Please do not write
            your name, account details or wallet credentials on this form.
          </p>
          <p lang="vi" className={styles.translation}>
            Bảng hỏi này tìm hiểu trải nghiệm, đánh giá và ý định tiếp tục đầu
            tư tiền mã hóa của Anh/Chị. Không có câu trả lời đúng hoặc sai. Việc
            tham gia là tự nguyện; Anh/Chị có thể không trả lời câu hỏi hoặc
            dừng bất cứ lúc nào. Vui lòng không ghi họ tên, thông tin tài khoản
            hoặc thông tin truy cập ví vào bảng hỏi.
          </p>
        </div>

        <form
          aria-label="Closed bilingual questionnaire"
          aria-describedby="collection-closed-en collection-closed-vi"
        >
          <section className={styles.part} aria-labelledby="part-one">
            <div className={styles.partHeading}>
              <span className={styles.partNumber} aria-hidden="true">
                01
              </span>
              <div>
                <h2 id="part-one">Part 1. Participation and background</h2>
                <p lang="vi">Phần 1. Tham gia khảo sát và thông tin chung</p>
              </div>
            </div>

            <h3 className={styles.subheading}>
              Taking part <span lang="vi">/ Tham gia khảo sát</span>
            </h3>
            <div className={styles.participation}>
              {participationQuestions.map((question) => (
                <BackgroundField key={question.id} question={question} />
              ))}
            </div>

            <h3 className={styles.subheading}>
              Background information <span lang="vi">/ Thông tin chung</span>
            </h3>
            <div className={styles.instructions}>
              <p>One option per question. Questions may be left unanswered.</p>
              <p lang="vi">
                Mỗi câu hỏi chọn một phương án. Anh/Chị có thể không trả lời câu
                hỏi nếu không muốn.
              </p>
            </div>
            <div className={styles.backgroundGrid}>
              {backgroundQuestions.map((question) => (
                <BackgroundField key={question.id} question={question} />
              ))}
            </div>
          </section>

          <section className={styles.part} aria-labelledby="part-two">
            <div className={styles.partHeading}>
              <span className={styles.partNumber} aria-hidden="true">
                02
              </span>
              <div>
                <h2 id="part-two">
                  Part 2. Your cryptocurrency investment experience
                </h2>
                <p lang="vi">
                  Phần 2. Trải nghiệm đầu tư tiền mã hóa của Anh/Chị
                </p>
              </div>
            </div>
            <div className={styles.instructions}>
              <p>
                Based on your own cryptocurrency investment experience, select
                one box for each statement. If you choose not to answer a
                statement, leave its response blank.
              </p>
              <p lang="vi">
                Dựa trên trải nghiệm đầu tư tiền mã hóa của bản thân, Anh/Chị
                hãy chọn một ô cho mỗi phát biểu. Nếu không muốn trả lời phát
                biểu nào, Anh/Chị có thể để trống câu trả lời đó.
              </p>
            </div>

            <ol
              className={styles.scaleLegend}
              aria-label="Seven-point response scale / Thang đo bảy mức độ"
            >
              {ratingScale.map((rating, index) => (
                <li key={rating.en}>
                  <span className={styles.scaleNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>
                    {rating.en}
                    <span lang="vi" className={styles.translation}>
                      {rating.vi}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            {ratingGroups.map((group) => (
              <section
                key={group.code}
                className={styles.ratingGroup}
                aria-labelledby={`group-${group.code}`}
              >
                <h3 id={`group-${group.code}`} className={styles.groupHeading}>
                  {group.en}
                  <span lang="vi">{group.vi}</span>
                </h3>
                <div className={styles.scaleHeader} aria-hidden="true">
                  <span>
                    Statement <span lang="vi">/ Phát biểu</span>
                  </span>
                  {ratingScale.map((rating, index) => (
                    <span key={rating.en}>{index + 1}</span>
                  ))}
                </div>
                {group.items.map((item, index) => {
                  const id = `${group.code}${index + 1}`;
                  return (
                    <div
                      key={id}
                      className={styles.ratingRow}
                      role="group"
                      aria-labelledby={`question-${id}`}
                      aria-disabled="true"
                    >
                      <p id={`question-${id}`} className={styles.statement}>
                        <span className={styles.questionCode}>{id}</span>
                        <span>
                          {item.en}
                          <span lang="vi" className={styles.translation}>
                            {item.vi}
                          </span>
                        </span>
                      </p>
                      <div className={styles.ratingOptions}>
                        {ratingScale.map((rating, ratingIndex) => (
                          <label
                            key={rating.en}
                            className={styles.ratingOption}
                          >
                            <input
                              type="checkbox"
                              name={id}
                              value={ratingIndex + 1}
                              checked={false}
                              readOnly
                              disabled
                              aria-label={`${id}: ${ratingIndex + 1} — ${rating.en} / ${rating.vi}`}
                            />
                            <span
                              className={styles.mobileRating}
                              aria-hidden="true"
                            >
                              {ratingIndex + 1}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </section>

          <footer className={styles.footer}>
            <div>
              <p>Thank you for your time and interest in this research.</p>
              <p lang="vi" className={styles.translation}>
                Trân trọng cảm ơn Anh/Chị đã dành thời gian quan tâm đến nghiên
                cứu.
              </p>
              <p className={styles.footerStatus}>
                Collection closed <span aria-hidden="true">/</span>{" "}
                <span lang="vi">Đã kết thúc thu thập dữ liệu</span>
              </p>
            </div>
            <ClosedQuestionnaireSubmit />
          </footer>
        </form>
      </article>
    </main>
  );
}
