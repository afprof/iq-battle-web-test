/* IQ BATTLE — runtime i18n layer (ko <-> en). Translates rendered Korean text nodes/attributes. */
(function () {
  if (window.__iqbI18n) return;
  var KO_RE = /[가-힣₩]/;
  /* 영어 모드: 원화(₩) 금액을 환율 ₩1,000 = $1 로 달러 표시 */
  function usd(s) { return s.replace(/₩\s?(\d[\d,]*)/g, function (_, n) { return "$" + (parseInt(n.replace(/,/g, ""), 10) / 1000).toFixed(2); }); }
  /* 중국어 모드: 원화(₩) 금액을 위안(¥)으로 표시 — 환율 ₩1,000 = ¥5 (아래 상수로 조정) */
  var CNY_PER_1000_KRW = 5;
  function cny(s) { return s.replace(/₩\s?(\d[\d,]*)/g, function (_, n) { return "¥" + (parseInt(n.replace(/,/g, ""), 10) / 1000 * CNY_PER_1000_KRW).toFixed(2); }); }
  var D = {
    /* tags */
    "수열": "Sequence", "연산": "Arithmetic", "논리": "Logic", "언어": "Verbal", "추론": "Reasoning", "공간": "Spatial", "기억": "Memory", "문자": "Letters",
    /* tiers / items */
    "브론즈": "Bronze", "실버": "Silver", "골드": "Gold", "플래티넘": "Platinum", "다이아": "Diamond",
    "무제한 1일권": "Unlimited 1-day pass", "무제한 월 구독": "Unlimited monthly plan",
    "기본": "Default", "선셋": "Sunset", "오션": "Ocean", "오로라": "Aurora", "로즈골드": "Rose Gold", "모노크롬": "Monochrome", "로열골드": "Royal Gold", "보이드": "Void",
    "없음": "None", "브레인": "Brain", "번개": "Lightning", "왕관": "Crown", "파이어": "Fire", "별": "Star", "해골": "Skull",
    /* missions */
    "대결 3회 완료": "Complete 3 battles", "3연승 달성": "Win 3 in a row", "대결에서 IQ 130 돌파": "Reach IQ 130 in a battle",
    /* alerts / errors */
    "카카오 SDK가 로드되지 않았습니다. index.html의 스크립트 태그를 확인하세요.": "Kakao SDK failed to load.",
    "이 결제는 안드로이드 앱 안에서만 가능해요.": "This purchase is only available inside the Android app.",
    "상품 정보를 아직 불러오지 못했어요. 잠시 후 다시 시도해주세요.": "Couldn't load product info yet. Please try again shortly.",
    "결제가 취소되었거나 실패했어요.": "The payment was cancelled or failed.",
    "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.": "Login failed. Please try again shortly.",
    "데모 모드: 실제 결제 없이 체험용으로 열렸어요. (청구 없음)": "Demo mode: unlocked for trial without real payment. (No charge)",
    "실제 결제는 안드로이드 앱에서만 가능해요. (지금은 미리보기 환경입니다)": "Real purchases are only available in the Android app. (This is a preview.)",
    "결제 연결 시간이 초과됐어요. Google Play 결제 설정(상품 등록·테스터 계정)을 확인해주세요.": "Payment connection timed out. Please check your Google Play billing setup.",
    "결제 처리에 실패했어요. 잠시 후 다시 시도해주세요.": "Payment failed. Please try again shortly.",
    "진행 기록을 초기화할까요? 되돌릴 수 없어요.": "Reset your progress? This cannot be undone.",
    /* auth / home */
    "게스트": "Guest", "로그인 중…": "Signing in…", "카카오 로그인": "Kakao Login", "카카오로 계속하기": "Continue with Kakao",
    "로그아웃": "Log out", "초기화": "Reset", "활동 지표": "Activity", "무제한": "Unlimited",
    "등급·레벨 설명": "Tier & level guide",
    "점은 승패로 오르내리는": "pts — a score that rises and falls with wins and losses:", "실력 점수": "skill rating", "예요": "",
    "· 다음 등급까지": "· To next tier:", "점": " pts", "연승": " win streak",
    "세계에서 가장 뛰어난": "Take on the world's", "IQ와 랭킹": "best IQ & ranking", "에 도전하세요": "",
    "문제를 풀 때마다 난이도가 실력에 맞춰 조정되고,": "Difficulty adapts to your skill with every question,",
    "IQ 지수와 전국 순위가 실시간으로 갱신됩니다.": "and your IQ score and world rank update in real time.",
    "대결 상대 찾기 →": "Find an opponent →", "무제한 이용권 사용 중": "Unlimited pass active",
    "무료 대결": "Free battles", "회 남음": "left",
    "내 분석 리포트": "My analysis report", "IRT 능력추정 · 유형별 강약점 · 반응속도": "IRT ability estimate · strengths & weaknesses · reaction speed",
    "포인트로 스킨·심볼 구매": "Buy skins & symbols with points",
    "※ 포인트는 게임 내 재화이며": "※ Points are in-game currency",
    "현금으로 환전되지 않습니다.": "and cannot be exchanged for cash.",
    "베팅 포인트 선택": "Choose your bet", "이기면 상대 포인트를 가져오고, 지면 잃습니다.": "Win to take your opponent's points; lose and you forfeit them.",
    "승리 시 +": "Win: +", "← 뒤로": "← Back",
    "무료 대결을 모두 사용했어요": "You've used all your free battles", "다음 무료 하트까지": "Next free heart in",
    "기다리거나, 광고를 보거나, 포인트나 무제한 이용권으로 바로 계속하세요.": "Wait, watch an ad, or continue right away with points or an unlimited pass.",
    "바로 대결하기 (하트": "Battle now (heart", "P로 하트 1개 (보유": "P for 1 heart (you have",
    "무제한 이용권": "Unlimited pass", "기간 내 하트 소모 없이 무제한": "Unlimited battles with no hearts used during the period",
    "← 홈으로": "← Home",
    "※ 가격·회복 시간은 예시입니다. 결제는 데모이며 실제 청구되지 않습니다.": "※ Prices and refill times are examples. Payments are a demo and are not actually charged.",
    "아직 남은 하트가 있어요!": "You still have hearts left!", "광고 시청 중…": "Watching ad…", "🎬 광고 보고 하트 1개 받기": "🎬 Watch an ad for 1 heart",
    "한 판 플레이해보셨네요!": "You've played a match!", "저장하려면 카카오 로그인이 필요해요.": "Log in to save your progress.",
    "나중에 할게요": "Maybe later", "홈·랭킹·스토어 구경은 로그인 없이도 계속 가능해요.": "You can still browse Home, Ranking and Store without logging in.",
    "계속 대결하고 레이팅·리포트·랭킹을": "Keep battling and save your rating, reports and ranking",
    /* battle */
    "비슷한 실력의 상대 찾는 중…": "Finding an opponent of similar skill…", "매칭중": "Matching",
    "님의 플레이 기록 기반 고스트 대결": "'s play history · ghost battle",
    "🎥 실제 유저": "🎥 Real player",
    "나": "Me", "상대": "Opponent", "승리 🏆": "Victory 🏆", "무승부": "Draw", "패배": "Defeat",
    "적응형 난이도 — 내 실력 추정치에 맞춰 자동 조정됩니다": "Adaptive difficulty — adjusts automatically to your estimated skill",
    "실시간 IQ (IRT 추정)": "Live IQ (IRT estimate)", "상위": "Top", "전체": "All", "위": "", "연속 🔥 +": "streak 🔥 +", "콤보": "Combo",
    "최종 IQ": "Final IQ", "전국": "Global rank", "내 IQ · 순위 잠금": "Your IQ & rank are locked", "결제하고 확인 · ₩500": "Pay to reveal · ₩500",
    "레이팅": "Rating", "연승 🔥": "win streak 🔥", "상세 분석 리포트 보기 →": "View detailed analysis report →", "재대결": "Rematch",
    /* report */
    "분석 리포트": "Analysis report", "최근 IQ": "Latest IQ", "결제 시 공개": "Revealed after purchase", "방금 결과 보기 · ₩500": "See this result · ₩500",
    "IQ 추이": "IQ trend", "최근": "Last", "경기 · 꾸준히 상승 중": "matches · steadily rising",
    "IQ 점수 구성 분해": "IQ score breakdown", "기본 100점 위에 정확도·속도가 얼마나 기여했는지 (직관적 참고용 분해)": "How much accuracy and speed added on top of the base 100 (an intuitive, reference-only breakdown)",
    "기본 100": "Base 100", "정확도": "Accuracy", "초": "s", "속도": "Speed",
    "강점 · 약점 인사이트": "Strengths & weaknesses", "가장 강한 유형은": "Your strongest type is", "(정답률": "(accuracy", "%), 가장 약한 유형은": "%), and your weakest is", "%)입니다.": "%).",
    "유형을 집중 연습하면 IQ 점수를 가장 빠르게 끌어올릴 수 있어요.": "Focusing your practice on this type is the fastest way to raise your IQ.",
    "대결을 완료하면 누적 강·약점이 표시됩니다.": "Complete a battle to see your cumulative strengths and weaknesses.",
    "반응속도 분석": "Reaction speed analysis", "문항당 평균 응답 시간 비교": "Average response time per question", "내 평균": "My average", "상위권 평균": "Top players' average", "전체 평균": "Overall average",
    "IRT 능력치(θ) 추정 · 신뢰구간": "IRT ability (θ) estimate & confidence interval", "추정 IQ 95% 신뢰구간": "Estimated IQ 95% confidence interval", "점 추정치": "point estimate", "· 오차 ±": "· margin ±",
    "(SE·Fisher 정보량 기반)": "(based on SE & Fisher information)",
    "경기별": "Per-match", "IQ 추이 그래프": "IQ trend chart", "(정확도·속도)": "(accuracy · speed)", "누적 유형별": "Cumulative by type", "강점·약점 인사이트": "strengths & weaknesses",
    "반응속도": "Reaction speed", "상위권/전체 비교": "vs. top players / overall", "IRT 기반": "IRT-based", "능력치·신뢰구간": "ability & confidence interval",
    "전체 리포트로 업그레이드": "Upgrade to the full report", "프리미엄 리포트": "Premium report",
    "방금 결과는 이미 확인했어요. 결제하면 이런 내용까지 볼 수 있어요:": "You've already seen this result. Pay to unlock more:", "결제하면 이런 내용을 볼 수 있어요:": "Pay to unlock:",
    "₩2,900 · 평생 이용": "₩2,900 · lifetime", "1회 결제 · 이후 모든 리포트 무제한 열람": "One-time payment · unlimited access to all reports",
    /* leaderboard */
    "전국 랭킹": "Leaderboard", "실제 참가자": "Real players", "상위 100명": "Top 100", "· 누적 레이팅 기준": "· by cumulative rating",
    "아직 집계된 참가자가 없어요. 대결을 시작해 첫 기록을 남겨보세요.": "No players ranked yet. Start a battle and set the first record!",
    "대결에서 이겨 레이팅을 올리면 순위가 상승합니다.": "Win battles to raise your rating and climb the ranks.",
    /* missions / store */
    "일일 미션": "Daily missions", "매일 자정 초기화 · 보상은 포인트로 지급": "Resets every midnight · rewards paid in points", "수령 완료": "Claimed", "받기": "Claim", "진행중": "In progress",
    "데모 버전 · 무료": "Demo version · Free", "구매 버튼을 눌러도 실제로 청구되지 않아요": "Tapping Buy will not actually charge you",
    "운영 수익원 · 실제 결제로 구매합니다": "Real purchases are charged normally", "보유중": "Owned",
    "※ 가격은 예시입니다. 실제 결제는 인앱결제/PG(토스페이먼츠·포트원 등) 연동이 필요하며, 사업자 정산 계좌로 입금됩니다.": "※ Prices are examples.",
    "포인트 충전": "Top up points", "하트 구매(": "Buy heart (", "에 쓰는 게임 내 재화입니다.": " — in-game currency.",
    "포인트 → 현금 환전은 불가능합니다": "Points cannot be exchanged back to cash",
    "(현금 → 포인트로만 전환되는 단방향 충전). 아바타 스킨은 무료, 심볼은 레벨업으로 해금돼요.": "(top-up is one-way, cash → points). Avatar skins are free; symbols unlock as you level up.",
    "스킨은 자유롭게 골라 쓰고, 심볼은 레벨을 올리면 자동으로 해금돼요": "Pick any skin you like; symbols unlock automatically as you level up",
    "스킨": "Skins", "· 전부 무료": "· all free", "심볼": "Symbols", "· 레벨업 시 자동 해금": "· unlock as you level up",
    "심볼은 돈이나 포인트로 살 수 없어요 — 대결을 계속해서 레벨을 올리면 자동으로 풀립니다.": "Symbols can't be bought with money or points — keep battling and level up to unlock them.",
    "방금 결과 확인권": "Last-result pass", "직전 대결의 최종 IQ · 상위% · 전국 순위만": "Final IQ, top % and world rank of your last battle only",
    "프리미엄 리포트 (평생)": "Premium report (lifetime)", "IQ 추이·IRT 능력추정·강약점 전체": "IQ trend · IRT ability estimate · all strengths & weaknesses",
    "광고 제거 (1회 결제)": "Remove ads (one-time purchase)", "한 번 결제로 대결 사이 광고 없이 몰입": "One payment for an ad-free experience between battles",
    "장착중": "Equipped", "선택": "Select", "장착하기": "Equip",
    "홈": "Home", "랭킹": "Ranking", "미션": "Missions", "스토어": "Store",
    "결제 확인": "Confirm purchase", "결제 금액": "Amount", "데모 버전이라 실제로 청구되지 않아요": "This is a demo — you won't be charged", "취소": "Cancel", "확인": "OK",
    "처리 중…": "Processing…", "무료로 체험하기": "Try it free", "결제하기": "Pay",
    /* info modal */
    "등급 · 레벨 안내": "Tiers & Levels Guide", "티어 (등급)": "Tier (rank)", "레이팅 점수에 따라 5단계로 나뉩니다. 대결 상대는": "Players are split into 5 tiers by rating. Opponents are matched among",
    "비슷한 레이팅끼리": "similar ratings", "매칭돼요.": ".", "· 현재": "· current",
    "레이팅 (실력 점수)": "Rating (skill score)", "대결 결과로 오르내리는 실력 지표입니다. 승리하면": "A skill metric that moves with battle results. Win:", ", 패배하면": ", lose:",
    ", 무승부는 변동 없음. 레이팅이 티어를 결정하고, 전국 순위의 기준이 됩니다.": ", draw: no change. Your rating decides your tier and is the basis of the world ranking.",
    "레벨 (Lv) · 경험치(XP)": "Level (Lv) · Experience (XP)", "대결을 할수록 쌓이는": "An activity/proficiency metric that grows as you battle:", "활동·숙련도 지표": "activity & proficiency",
    "입니다. 실력(레이팅)과 달리 져도 오릅니다. 대결마다 XP를 얻고(승리 60 + 정답 수 × 8 등),": ". Unlike rating, it rises even when you lose. You earn XP each battle (win 60 + correct answers × 8, etc.),",
    "를 채우면 레벨업합니다. 현재 Lv.": "and level up when you fill the bar. Current Lv.",
    "IQ 측정 방식 (IRT 적응형 검사)": "How IQ is measured (IRT adaptive test)", "문제를 맞히거나 틀릴 때마다": "After every right or wrong answer, your ability (θ) is re-estimated with",
    "2모수 로지스틱(2PL) 문항반응이론": "2-parameter logistic (2PL) item response theory",
    "으로 능력치(θ)를 다시 추정하고, 다음 문제는 그 실력에 가까운 난이도로 자동 선택됩니다. 사전분포(θ~N(0,1))를 반영한 베이지안 추정이라 응답이 적을 때도 값이 튀지 않고 안정적입니다. 최종 IQ는": ", and the next question is chosen at a difficulty close to that level. Because it is a Bayesian estimate with a prior (θ~N(0,1)), the value stays stable even with few answers. Final IQ is",
    "로 환산하며, 표준오차를 바탕으로 95% 신뢰구간을 함께 제공합니다.": ", with a 95% confidence interval based on the standard error.",
    "고스트 대결 · 실제 참가자 랭킹": "Ghost battles & real-player ranking", "매칭되는 상대는 레이팅이 비슷한": "Your opponent may be the", "실제 다른 참가자의 과거 플레이 기록": "past play record of a real player with a similar rating",
    "일 수 있습니다(데이터가 충분하지 않으면 시뮬레이션 상대로 대체). 랭킹 화면의 \"실제 참가자 랭킹\"도 실제 이용자들의 누적 기록입니다.": " (replaced by a simulated opponent when there isn't enough data). The ranking screen also shows real users' cumulative records.",
    "포인트 (P)": "Points (P)", "대결에 거는": "The", "인게임 재화": "in-game currency", "입니다. 이기면 상대 포인트를 가져오고 지면 잃습니다. 스토어에서 현금으로 충전할 수 있고, 하트가 부족할 때": " you bet in battles. Win to take your opponent's points; lose and you forfeit them. You can top up with cash in the Store, and use",
    "P로 하트 1개": "P for 1 heart", "를 구매하는 데 씁니다.": " when you run out of hearts.",
    "포인트를 다시 현금으로 바꿀 수는 없습니다": "Points cannot be converted back to cash",
    "(충전은 현금→포인트 단방향이며, 포인트의 용도는 하트 구매뿐입니다).": "(top-up is one-way cash → points, and points are only used to buy hearts).",
    "아바타 꾸미기": "Avatar customization", "스킨(아바타 색상 테마)은 처음부터 전부 무료로 골라 쓸 수 있어요. 심볼(뱃지)은 돈이나 포인트로 살 수 없고,": "Skins (avatar color themes) are all free from the start. Symbols (badges) can't be bought with money or points;",
    "레벨을 올리면 자동으로 해금": "they unlock automatically as you level up", "되는 성취 배지예요.": " — achievement badges.",
    "하트 (무료 대결)": "Hearts (free battles)", "무료 대결 횟수예요. 한 판에 1개 소모하고,": "Your free-battle count. Each match uses 1, and you regain", "30분당 1개": "1 every 30 minutes", "자동 회복됩니다. 광고 시청이나 무제한 이용권으로도 이어서 할 수 있어요.": " automatically. You can also continue by watching an ad or using an unlimited pass.",
    "Lv는 대결할수록 오르는": "Lv rises the more you battle:",
    /* funnel / dev */
    "이벤트 추적 · 퍼널 지표": "Event tracking · funnel metrics", "접속": "Visit", "대결 시작": "Battle start", "대결 완료": "Battle complete", "페이월 노출": "Paywall view", "결제": "Purchase",
    "온보딩 통과율": "Onboarding rate", "대결 시작 → 완료": "Start → complete", "페이월 도달률": "Paywall reach", "완료 → 하트 소진": "Complete → hearts used up", "결제 전환율": "Purchase conversion", "페이월 → 결제": "Paywall → purchase",
    "이벤트 추적 · 퍼널": "Event tracking · funnel", "이번 세션 기준 · 실서비스에선 GA4·PostHog로 전송돼 다수 이용자 KPI가 됩니다.": "This session only.", "최근 이벤트": "Recent events", "아직 없음 — 대결을 시작해 보세요.": "None yet — start a battle.",
    /* seed pool questions (fallback) */
    "10,000원의 30% 는?": "What is 30% of 10,000?", "가장 큰 값은?": "Which is the largest?", "15의 40% + 8 = ?": "40% of 15 + 8 = ?",
    "성격이 다른 하나는? (2, 3, 9, 11)": "Which one is different? (2, 3, 9, 11)",
    "다른 하나는? (사자·호랑이·독수리·표범)": "Which one is different? (lion·tiger·eagle·leopard)", "사자": "Lion", "호랑이": "Tiger", "독수리": "Eagle", "표범": "Leopard",
    "다른 하나는? (당근·감자·양파·사과)": "Which one is different? (carrot·potato·onion·apple)", "당근": "Carrot", "감자": "Potato", "양파": "Onion", "사과": "Apple",
    "다른 하나는? (원·삼각형·정사각형·정육면체)": "Which one is different? (circle·triangle·square·cube)", "원": "Circle", "삼각형": "Triangle", "정사각형": "Square", "정육면체": "Cube",
    "A>B, B>C 이면?": "If A>B and B>C, then?", "알 수 없다": "Cannot be determined",
    "모든 A는 B다. 어떤 B는 C다. 반드시 참인 것은?": "All A are B. Some B are C. Which must be true?", "모든 A는 C다": "All A are C", "어떤 A는 C다": "Some A are C", "A가 C인지 알 수 없다": "Cannot tell whether A is C", "C는 모두 A다": "All C are A",
    "낮 : 밤 = 여름 : ?": "Day : Night = Summer : ?", "겨울": "Winter", "봄": "Spring", "가을": "Autumn", "아침": "Morning",
    "시계 : 시간 = 온도계 : ?": "Clock : Time = Thermometer : ?", "무게": "Weight", "온도": "Temperature", "거리": "Distance",
    "손 : 장갑 = 발 : ?": "Hand : Glove = Foot : ?", "양말": "Sock", "신발": "Shoe", "구두": "Dress shoe", "깔창": "Insole",
    "의사 : 병원 = 교사 : ?": "Doctor : Hospital = Teacher : ?", "학교": "School", "교실": "Classroom", "책": "Book", "학생": "Student",
    "책 : 저자 = 그림 : ?": "Book : Author = Painting : ?", "화가": "Painter", "붓": "Brush", "미술관": "Museum", "물감": "Paint",
    "물 : 갈증 = 음식 : ?": "Water : Thirst = Food : ?", "허기": "Hunger", "포만": "Fullness", "요리": "Cooking", "식당": "Restaurant",
    "규칙: 1→1, 2→4, 3→9, 4→?": "Rule: 1→1, 2→4, 3→9, 4→?", "규칙: 2→6, 3→12, 4→20, 5→?": "Rule: 2→6, 3→12, 4→20, 5→?",
    "정육면체의 면은 몇 개?": "How many faces does a cube have?", "삼각형 내각의 합은?": "What is the sum of a triangle's interior angles?",
    "90도": "90°", "180도": "180°", "270도": "270°", "360도": "360°", "시계가 3시일 때 시침과 분침의 각도는?": "At 3 o'clock, what is the angle between the hour and minute hands?", "60도": "60°", "120도": "120°", "45도": "45°",
    "정오각형의 꼭짓점은 몇 개?": "How many vertices does a regular pentagon have?",
    "다음을 거꾸로 나열하면? 3, 7, 1, 9": "Reverse the list: 3, 7, 1, 9", "다음 중 두 번째로 큰 수는? 14, 39, 27, 8": "Which is the second largest? 14, 39, 27, 8",
    "순서대로 기억: 6-2-9-4-1. 세 번째 숫자는?": "Memorize in order: 6-2-9-4-1. What is the third digit?", "다음 목록에서 짝수의 개수는? 3, 8, 11, 6, 15, 4": "How many even numbers are in this list? 3, 8, 11, 6, 15, 4",
    "A=3, B=A+2, C=B×2 일 때 C의 값은?": "If A=3, B=A+2, C=B×2, what is C?", "다섯 자리 15948 중 세 번째 숫자는?": "What is the third digit of the five-digit number 15948?",
    "단어 목록 '사과-기차-우산-바다' 에서 두 번째로 제시된 단어는?": "In the word list 'apple-train-umbrella-sea', which word was shown second?", "기차": "Train", "우산": "Umbrella", "바다": "Sea",
    "숫자 7-3-9-2-5-1 중 짝수만 순서대로 나열하면?": "List only the even digits of 7-3-9-2-5-1 in order.",
    "'모든 짝수는 2의 배수이다'는 어떤 명제 유형인가?": "What type of proposition is 'Every even number is a multiple of 2'?", "항진명제": "Tautology", "모순명제": "Contradiction", "우연명제": "Contingent proposition", "무의미명제": "Meaningless proposition",
    "규칙: f(n) = f(n-1) + f(n-2) - 1, f(1)=1, f(2)=2 일 때 f(4)는?": "Rule: f(n) = f(n-1) + f(n-2) - 1, f(1)=1, f(2)=2. What is f(4)?",
    "정십이면체의 면은 몇 개?": "How many faces does a regular dodecahedron have?", "다음 규칙에서 빠진 것은? CE, FH, IK, ?": "What is missing in this pattern? CE, FH, IK, ?"
  };
  Object.assign(D, {
    "로그인이 필요해요": "Sign in required",
    "대결을 시작하고 레이팅·리포트·랭킹을": "Sign in to start battles and save your",
    "저장하려면 로그인해 주세요.": "rating, reports and ranking.",
    "홈으로 돌아가기": "Back to home",
    "로그인하면 개인정보처리방침에 동의한 것으로 봅니다.": "By signing in, you accept the Privacy Policy.",
    "로그인하고 실시간 IQ 대결을 시작하세요.": "Sign in to start real-time IQ battles.",
    "Google로 계속하기": "Continue with Google",
    "로그인하면": "By signing in, you accept the",
    "개인정보처리방침": "Privacy Policy",
    "에 동의한 것으로 봅니다.": ".",
    "앱 안에서는 구글 로그인이 아직 지원되지 않아요. 카카오로 로그인하거나 웹 브라우저에서 접속해 주세요.": "Google sign-in is not supported inside the app yet. Sign in with Kakao, or open the web version in a browser.",
    "구글 로그인을 준비 중이에요. 잠시 후 다시 눌러주세요.": "Google sign-in is getting ready. Please try again in a moment.",
    "구글 로그인이 취소되었어요.": "Google sign-in was cancelled.",
    "구글 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.": "Google sign-in failed. Please try again shortly.",
    "구글 토큰이 유효하지 않습니다": "The Google token is invalid.",
    "회 남음": " left", "Lv는 대결할수록 오르는": "Lv rises as you battle —", "활동 지표": "activity", "점은 승패로 오르내리는": " pts moves with wins & losses —",
    "※ 충전한 포인트는 대결 베팅과": "※ Top-up points are used for betting in battles and", "하트 구매(": "buying hearts (", "에 쓰는 게임 내 재화입니다.": " — they're in-game currency.",
    "실제 참가자": "Players:", "매칭돼요.": ".", "전체": "Rank",
    "대결을 할수록 쌓이는": "A metric that grows as you battle:",
    "입니다. 실력(레이팅)과 달리 져도 오릅니다. 대결마다 XP를 얻고(승리 60 + 정답 수 × 8 등),": ". Unlike rating, it rises even when you lose. You earn XP each battle (win 60 + correct answers × 8, etc.), and you level up each time you collect ",
    "를 채우면 레벨업합니다. 현재 Lv.": ". Current Lv.",
    "매칭되는 상대는 레이팅이 비슷한": "Your opponent may be",
    "계속 대결하고 레이팅·리포트·랭킹을": "Keep battling to build your rating, reports and ranking.",
    "2모수 로지스틱(2PL) 문항반응이론으로 추정 · 문항마다 난이도가 실력에 맞춰 자동 조정(적응형 검사)됩니다": "Estimated with 2-parameter logistic (2PL) item response theory · difficulty adapts to your skill on every question (adaptive test)",
    "경기 · 꾸준히 상승 중": " matches · steadily rising", "(정답률": " (accuracy",
    "유형을 집중 연습하면 IQ 점수를 가장 빠르게 끌어올릴 수 있어요.": " type — focusing your practice here is the fastest way to raise your IQ.",
    "※ 충전한 포인트는": "※ Top-up points are"
  });
  /* dynamic patterns: [regex, replacement] */
  var P = [
    [/^(\d[\d,.]*)초$/, "$1s"],
    [/^(\d[\d,]*)명$/, "$1 players"],
    [/^Lv\.(\d+) 필요$/, "Lv.$1 required"],
    [/^포인트 (\d[\d,]*)P$/, "$1 Points"],
    [/^· 다음 회복 (.+)$/, "· Next refill $1"],
    [/^알 수 없는 상품: (.+)$/, "Unknown product: $1"],
    [/^(\d[\d,.]*)위$/, "#$1"],
    [/^(\d[\d,.]*)점$/, "$1 pts"],
    [/^(\d+)연승$/, "$1 win streak"],
    [/^(\d+)회 남음$/, "$1 left"],
    [/^상위 (\d[\d.]*)%$/, "Top $1%"],
    [/^전국 (\d[\d,]*)위$/, "World #$1"],
    [/^(\d+)경기$/, "$1 matches"],
    [/^(\d+)도$/, "$1°"],
    [/^(\d+) · (.+)$/, function (_, a, b) { return a + " · " + (D[b] || b); }]
  ];

  var lang = "ko";
  try { lang = localStorage.getItem("iqb_lang") || ""; } catch (e) {}
  if (lang !== "ko" && lang !== "en" && lang !== "zh") { var nl = navigator.language || "ko"; lang = /^ko/i.test(nl) ? "ko" : /^zh/i.test(nl) ? "zh" : "en"; }
  window.IQB_LANG = lang;

  function tr(raw) {
    if (!raw || !KO_RE.test(raw)) return null;
    var m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var core = m[2].replace(/\s+/g, " ");
    if (!core) return null;
    var v;
    var Z = window.__iqbZh;
    if (lang === "zh" && Z) {
      v = Z.D[core];
      if (v === undefined) for (var j = 0; j < Z.P.length; j++) if (Z.P[j][0].test(core)) { v = core.replace(Z.P[j][0], Z.P[j][1]); break; }
    }
    if (v === undefined) v = D[core];
    if (v === undefined) {
      for (var i = 0; i < P.length; i++) if (P[i][0].test(core)) { v = core.replace(P[i][0], P[i][1]); break; }
    }
    if (v === undefined && core.indexOf("\u20A9") >= 0) v = core;
    if (v === undefined) return null;
    v = lang === "zh" ? cny(v) : usd(v);
    return (/^[\s.,;:!?)\]]/.test(v) ? "" : m[1]) + v + (/\s$/.test(v) ? "" : m[3]);
  }
  window.__iqbTr = tr; window.__iqbDict = D;

  var NODE = new WeakMap(), ATTR = new WeakMap();
  var ATTRS = ["title", "placeholder", "aria-label", "alt"];

  function applyNode(n) {
    var rec = NODE.get(n), cur = n.nodeValue;
    if (lang !== "ko") {
      if (rec && cur === rec.t && rec.l === lang) return;
      var src = (rec && cur === rec.t) ? rec.o : cur;
      var t = tr(src);
      if (t != null) { NODE.set(n, { o: src, t: t, l: lang }); n.nodeValue = t; }
      else if (rec) { if (cur === rec.t) n.nodeValue = rec.o; NODE.delete(n); }
    } else if (rec) {
      if (cur === rec.t) n.nodeValue = rec.o;
      NODE.delete(n);
    }
  }
  function applyAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var rec = ATTR.get(el) || {}, cur = el.getAttribute(a), r = rec[a];
      if (lang !== "ko") {
        if (r && cur === r.t && r.l === lang) continue;
        var src = (r && cur === r.t) ? r.o : cur;
        var t = tr(src);
        if (t != null) { rec[a] = { o: src, t: t, l: lang }; ATTR.set(el, rec); el.setAttribute(a, t); }
        else if (r) { if (cur === r.t) el.setAttribute(a, r.o); delete rec[a]; }
      } else if (r) { if (cur === r.t) el.setAttribute(a, r.o); delete rec[a]; }
    }
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { applyNode(root); return; }
    if (root.nodeType !== 1) return;
    var tag = root.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") return;
    applyAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (x) { return x.nodeType === 1 && (x.tagName === "SCRIPT" || x.tagName === "STYLE") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var x;
    while ((x = w.nextNode())) { if (x.nodeType === 3) applyNode(x); else applyAttrs(x); }
  }

  var mo = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === "characterData") applyNode(m.target);
      else if (m.type === "attributes") applyAttrs(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
    }
  });
  function start() {
    scan(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* alert / confirm */
  var _alert = window.alert, _confirm = window.confirm;
  window.alert = function (m) { var t = lang !== "ko" ? tr(String(m)) : null; return _alert.call(window, t != null ? t : m); };
  window.confirm = function (m) { var t = lang !== "ko" ? tr(String(m)) : null; return _confirm.call(window, t != null ? t : m); };

  function setLang(l) {
    if (l !== "ko" && l !== "en" && l !== "zh") return;
    lang = l; window.IQB_LANG = l;
    try { localStorage.setItem("iqb_lang", l); } catch (e) {}
    document.documentElement.lang = l;
    scan(document.body);
    paintBtn();
    try { window.dispatchEvent(new CustomEvent("iqb-lang", { detail: l })); } catch (e) {}
  }
  window.setIqbLang = setLang;

  /* floating toggle */
  var btn;
  function paintBtn() {
    if (!btn) return;
    var L3 = [["ko", "KO"], ["en", "EN"], ["zh", "CN"]], h = "";
    for (var i = 0; i < L3.length; i++) {
      h += (i ? '<span style="opacity:.35"> | </span>' : "") + '<span data-l="' + L3[i][0] + '" style="opacity:' + (lang === L3[i][0] ? 1 : .45) + ';padding:2px 1px">' + L3[i][1] + "</span>";
    }
    btn.innerHTML = h;
  }
  function mountBtn() {
    btn = document.createElement("button");
    btn.setAttribute("aria-label", "Language");
    btn.style.cssText = "position:fixed;top:8px;right:8px;z-index:99999;background:rgba(10,14,24,.78);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:5px 10px;font:800 11px/1 system-ui,sans-serif;letter-spacing:.5px;cursor:pointer;backdrop-filter:blur(6px)";
    btn.onclick = function (ev) { var tg = ev.target, l = tg && tg.getAttribute && tg.getAttribute("data-l"); setLang(l || (lang === "ko" ? "en" : lang === "en" ? "zh" : "ko")); };
    document.body.appendChild(btn);
    paintBtn();
  }

  window.__iqbI18n = true;
  document.documentElement.lang = lang;
  function boot() { mountBtn(); start(); }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
