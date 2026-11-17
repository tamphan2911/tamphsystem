export type BilingualText = { en: string; vi: string };
export type BackgroundQuestion = BilingualText & {
  id: string;
  options: BilingualText[];
};
export type RatingGroup = BilingualText & {
  code: string;
  items: BilingualText[];
};

// Source: the supplied English and Vietnamese questionnaires. Collection dates
// are from section 3.1 of the revised manuscript (January to March 2026).
export const collectionPeriod: BilingualText = {
  en: "January–March 2026",
  vi: "Tháng 1–3 năm 2026",
};

export const closureMessage: BilingualText = {
  en: "Data collection took place from January to March 2026 and has now ended. We are no longer accepting responses. The questionnaire remains available to read, but answers cannot be selected or submitted.",
  vi: "Thời gian thu thập dữ liệu từ tháng 1 đến tháng 3 năm 2026 đã kết thúc. Chúng tôi không tiếp nhận thêm câu trả lời. Anh/Chị vẫn có thể xem bảng hỏi, nhưng không thể chọn hoặc gửi câu trả lời.",
};

export const participationQuestions: BackgroundQuestion[] = [
  {
    id: "consent",
    en: "I voluntarily agree to take part in this questionnaire.",
    vi: "Tôi tự nguyện đồng ý tham gia khảo sát này.",
    options: [
      { en: "Yes", vi: "Đồng ý" },
      {
        en: "No — please stop here",
        vi: "Không đồng ý — vui lòng dừng tại đây",
      },
    ],
  },
  {
    id: "experience",
    en: "Have you ever invested in cryptocurrency?",
    vi: "Anh/Chị đã từng đầu tư vào tiền mã hóa chưa?",
    options: [
      { en: "Yes — please continue", vi: "Có — vui lòng tiếp tục" },
      { en: "No — please stop here", vi: "Chưa — vui lòng dừng tại đây" },
    ],
  },
];

export const backgroundQuestions: BackgroundQuestion[] = [
  {
    id: "D1",
    en: "Gender",
    vi: "Giới tính",
    options: [
      { en: "Male", vi: "Nam" },
      { en: "Female", vi: "Nữ" },
    ],
  },
  {
    id: "D2",
    en: "Age group",
    vi: "Nhóm tuổi",
    options: [
      { en: "Under 25", vi: "Dưới 25 tuổi" },
      { en: "25–34", vi: "Từ 25 đến 34 tuổi" },
      { en: "35–44", vi: "Từ 35 đến 44 tuổi" },
      { en: "45 and above", vi: "Từ 45 tuổi trở lên" },
    ],
  },
  {
    id: "D3",
    en: "Highest education level",
    vi: "Trình độ học vấn cao nhất",
    options: [
      { en: "Undergraduate or below", vi: "Đại học trở xuống" },
      { en: "Postgraduate", vi: "Sau đại học" },
    ],
  },
  {
    id: "D4",
    en: "Average monthly personal income",
    vi: "Thu nhập cá nhân bình quân mỗi tháng",
    options: [
      { en: "Below 10 million VND", vi: "Dưới 10 triệu đồng" },
      { en: "10–20 million VND", vi: "Từ 10 đến 20 triệu đồng" },
      { en: "Above 20 million VND", vi: "Trên 20 triệu đồng" },
    ],
  },
  {
    id: "D5",
    en: "Cryptocurrency investment experience",
    vi: "Kinh nghiệm đầu tư tiền mã hóa",
    options: [
      { en: "Less than 1 year", vi: "Dưới 1 năm" },
      { en: "1–3 years", vi: "Từ 1 đến 3 năm" },
      { en: "More than 3 years", vi: "Trên 3 năm" },
    ],
  },
  {
    id: "D6",
    en: "City of residence",
    vi: "Thành phố đang sinh sống",
    options: [
      { en: "Ho Chi Minh City", vi: "Thành phố Hồ Chí Minh" },
      { en: "Hanoi", vi: "Hà Nội" },
    ],
  },
];

export const ratingScale: BilingualText[] = [
  { en: "Strongly disagree", vi: "Hoàn toàn không đồng ý" },
  { en: "Disagree", vi: "Không đồng ý" },
  { en: "Somewhat disagree", vi: "Hơi không đồng ý" },
  { en: "Neutral", vi: "Trung lập" },
  { en: "Somewhat agree", vi: "Hơi đồng ý" },
  { en: "Agree", vi: "Đồng ý" },
  { en: "Strongly agree", vi: "Hoàn toàn đồng ý" },
];

export const ratingGroups: RatingGroup[] = [
  {
    code: "SQ",
    en: "System quality",
    vi: "Chất lượng hệ thống",
    items: [
      {
        en: "Cryptocurrency platforms operate reliably.",
        vi: "Các nền tảng tiền mã hóa hoạt động đáng tin cậy.",
      },
      {
        en: "Cryptocurrency systems are easy to use.",
        vi: "Các hệ thống tiền mã hóa dễ sử dụng.",
      },
      {
        en: "The platforms provide stable performance.",
        vi: "Các nền tảng có hiệu suất hoạt động ổn định.",
      },
      {
        en: "Transactions are processed quickly.",
        vi: "Các giao dịch được xử lý nhanh chóng.",
      },
      {
        en: "The system functions consistently without errors.",
        vi: "Hệ thống hoạt động nhất quán và không gặp lỗi.",
      },
      {
        en: "Overall, the platform quality is high.",
        vi: "Nhìn chung, chất lượng nền tảng ở mức cao.",
      },
    ],
  },
  {
    code: "IQ",
    en: "Information quality",
    vi: "Chất lượng thông tin",
    items: [
      {
        en: "Information about cryptocurrencies is accurate.",
        vi: "Thông tin về tiền mã hóa là chính xác.",
      },
      {
        en: "Information is up-to-date and timely.",
        vi: "Thông tin được cập nhật và cung cấp kịp thời.",
      },
      {
        en: "Information is clear and understandable.",
        vi: "Thông tin rõ ràng và dễ hiểu.",
      },
      {
        en: "The platform provides sufficient information for decision-making.",
        vi: "Nền tảng cung cấp đầy đủ thông tin để đưa ra quyết định.",
      },
      {
        en: "Information is reliable and trustworthy.",
        vi: "Thông tin đáng tin cậy và có thể tin tưởng.",
      },
    ],
  },
  {
    code: "PP",
    en: "Privacy protection",
    vi: "Bảo vệ quyền riêng tư",
    items: [
      {
        en: "My personal data is well protected on crypto platforms.",
        vi: "Dữ liệu cá nhân của tôi được bảo vệ tốt trên các nền tảng tiền mã hóa.",
      },
      {
        en: "Cryptocurrency transactions are secure.",
        vi: "Các giao dịch tiền mã hóa được bảo mật.",
      },
      {
        en: "I feel safe sharing information on these platforms.",
        vi: "Tôi cảm thấy an toàn khi chia sẻ thông tin trên các nền tảng này.",
      },
      {
        en: "The platform protects against unauthorized access.",
        vi: "Nền tảng bảo vệ khỏi các hành vi truy cập trái phép.",
      },
      {
        en: "Security features reduce my concerns about fraud.",
        vi: "Các tính năng bảo mật làm giảm lo ngại của tôi về gian lận.",
      },
      {
        en: "Overall, privacy protection is satisfactory.",
        vi: "Nhìn chung, việc bảo vệ quyền riêng tư là thỏa đáng.",
      },
    ],
  },
  {
    code: "TDP",
    en: "Trust in digital platforms",
    vi: "Niềm tin vào nền tảng số",
    items: [
      {
        en: "I trust cryptocurrency platforms.",
        vi: "Tôi tin tưởng các nền tảng tiền mã hóa.",
      },
      {
        en: "Cryptocurrency systems are reliable.",
        vi: "Các hệ thống tiền mã hóa đáng tin cậy.",
      },
      {
        en: "I feel confident when making transactions.",
        vi: "Tôi cảm thấy tự tin khi thực hiện giao dịch.",
      },
      {
        en: "The system operates with integrity.",
        vi: "Hệ thống hoạt động một cách chính trực.",
      },
      {
        en: "I believe cryptocurrency platforms are trustworthy.",
        vi: "Tôi tin rằng các nền tảng tiền mã hóa là đáng tin cậy.",
      },
    ],
  },
  {
    code: "PIV",
    en: "Perceived investment value",
    vi: "Giá trị đầu tư cảm nhận",
    items: [
      {
        en: "Cryptocurrency investment provides financial benefits.",
        vi: "Đầu tư tiền mã hóa mang lại lợi ích tài chính.",
      },
      {
        en: "It improves my investment opportunities.",
        vi: "Đầu tư tiền mã hóa cải thiện các cơ hội đầu tư của tôi.",
      },
      {
        en: "It enhances my financial decision-making.",
        vi: "Đầu tư tiền mã hóa giúp tôi đưa ra các quyết định tài chính tốt hơn.",
      },
      {
        en: "Cryptocurrency offers good value compared to alternatives.",
        vi: "Tiền mã hóa mang lại giá trị tốt so với các lựa chọn thay thế.",
      },
      {
        en: "It contributes positively to my investment portfolio.",
        vi: "Đầu tư tiền mã hóa đóng góp tích cực vào danh mục đầu tư của tôi.",
      },
      {
        en: "Overall, cryptocurrency investment is valuable.",
        vi: "Nhìn chung, đầu tư tiền mã hóa có giá trị.",
      },
    ],
  },
  {
    code: "DL",
    en: "Digital literacy",
    vi: "Năng lực số",
    items: [
      {
        en: "I understand how cryptocurrency investment works.",
        vi: "Tôi hiểu cách thức hoạt động của đầu tư tiền mã hóa.",
      },
      {
        en: "I can use cryptocurrency platforms effectively.",
        vi: "Tôi có thể sử dụng các nền tảng tiền mã hóa một cách hiệu quả.",
      },
      {
        en: "I am confident in managing digital financial tools.",
        vi: "Tôi tự tin trong việc quản lý các công cụ tài chính số.",
      },
      {
        en: "I can evaluate cryptocurrency investment information.",
        vi: "Tôi có thể đánh giá thông tin về đầu tư tiền mã hóa.",
      },
      {
        en: "I have sufficient knowledge to invest in cryptocurrencies.",
        vi: "Tôi có đủ kiến thức để đầu tư vào tiền mã hóa.",
      },
    ],
  },
  {
    code: "SAT",
    en: "Satisfaction",
    vi: "Sự hài lòng",
    items: [
      {
        en: "I am satisfied with my cryptocurrency investment experience.",
        vi: "Tôi hài lòng với trải nghiệm đầu tư tiền mã hóa của mình.",
      },
      {
        en: "My expectations are met by cryptocurrency investment.",
        vi: "Đầu tư tiền mã hóa đáp ứng các kỳ vọng của tôi.",
      },
      {
        en: "I am pleased with the overall performance.",
        vi: "Tôi hài lòng với hiệu quả tổng thể.",
      },
      {
        en: "The experience meets my needs.",
        vi: "Trải nghiệm này đáp ứng các nhu cầu của tôi.",
      },
      {
        en: "Overall, I am satisfied with cryptocurrency investment.",
        vi: "Nhìn chung, tôi hài lòng với việc đầu tư tiền mã hóa.",
      },
    ],
  },
  {
    code: "CI",
    en: "Continuance intention",
    vi: "Ý định tiếp tục đầu tư",
    items: [
      {
        en: "I intend to continue investing in cryptocurrencies.",
        vi: "Tôi có ý định tiếp tục đầu tư vào tiền mã hóa.",
      },
      {
        en: "I will increase my investment in the future.",
        vi: "Tôi sẽ tăng mức đầu tư của mình trong tương lai.",
      },
      {
        en: "I plan to invest regularly in cryptocurrencies.",
        vi: "Tôi dự định đầu tư thường xuyên vào tiền mã hóa.",
      },
      {
        en: "I will keep using cryptocurrency platforms.",
        vi: "Tôi sẽ tiếp tục sử dụng các nền tảng tiền mã hóa.",
      },
      {
        en: "I will continue engaging in cryptocurrency investment.",
        vi: "Tôi sẽ tiếp tục tham gia đầu tư tiền mã hóa.",
      },
    ],
  },
];
