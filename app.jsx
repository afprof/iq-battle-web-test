const { useState, useRef, useEffect } = React;

/* ============================================================
   IQ BATTLE v3 — 실제 출시용 (카카오 로그인 + Supabase)
   ------------------------------------------------------------
   v2(Claude 아티팩트 데모)에서 바뀐 부분:
   - window.storage(Claude 아티팩트 전용) → 카카오 로그인 + Supabase DB
   - 닉네임 직접 입력 → 카카오 계정 기반 로그인 (닉네임은 카카오에서 자동 수신)
   - 고스트 대결·랭킹은 이제 Supabase의 실제 유저 데이터를 조회

   배포 전 필수 설정 (동봉한 "카카오로그인-출시가이드.md" 참고):
   1) 아래 SUPABASE_URL / SUPABASE_ANON_KEY / KAKAO_JS_KEY 를 실제 값으로 교체
   2) index.html에 <script src="https://developers.kakao.com/sdk/js/kakao.js"></script> 추가
   3) supabase-schema.sql 실행 + kakao-auth-function.ts 를 Edge Function으로 배포
   4) 카카오 개발자 콘솔에 실제 배포 도메인을 Web 플랫폼으로 등록

   ⚠️ 이 파일은 Claude 아티팩트 미리보기에서는 카카오 로그인이 열리지 않습니다
   (카카오는 사전 등록된 실제 도메인에서만 로그인 창을 띄웁니다). 반드시
   Vercel/Netlify 등에 배포한 뒤 그 도메인에서 테스트하세요.

   여전히 이 범위를 벗어나는 것: 진짜 서버 기반 실시간 소켓 PvP, 서버측
   치팅 방지(현재는 클라이언트 계산을 그대로 신뢰), 앱스토어 네이티브 빌드.
   ============================================================ */

// ── 실제 값으로 교체하세요 (환경변수로 빼서 관리 권장) ──
const SUPABASE_URL = "https://fiqtweiklstkpnyetemz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RbKe9p0xgayUpZjvxhMhGw_RM_7WAvm";
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const SUPABASE_FN_URL = `${SUPABASE_FUNCTIONS_URL}/kakao-auth`;
const KAKAO_JS_KEY = "eeda4f8fd7b5473b4ae733019898e25c";
const SESSION_KEY = "iqbattle_session"; // localStorage에 { token, profileId } 저장

const C = {
  bg0: "#0b0818", bg1: "#130d2b", bg2: "#221247",
  card: "rgba(38,26,74,0.72)", cardTop: "rgba(58,42,104,0.55)",
  line: "rgba(160,140,250,0.16)", lineHi: "rgba(160,140,250,0.4)",
  violet: "#a78bfa", violetDeep: "#7c5cff", indigo: "#5b6cff",
  gold: "#ffce4d", goldDeep: "#f5a623",
  me: "#3ee0cf", foe: "#fb5c7d", mint: "#39d98a",
  text: "#f5f2ff", sub: "#c9bdf0", muted: "#8c80b5",
  shadow: "0 10px 34px rgba(0,0,0,0.45)",
  glow: "0 0 0 1px rgba(160,140,250,0.25), 0 10px 30px rgba(124,92,255,0.35)",
};
const FONT = "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

/* ── 문제 풀 (유형·개수 확장 + IRT 난이도(b) · 변별도(a) 파라미터) ──
   b: 문항 난이도 모수 (대략 -2 ~ +2, 클수록 어려움)
   a: 변별도 모수 (기본 1, 유형별로 살짝 다르게)
   실제 서비스라면 이 값들은 다수 응답자 데이터로 문항보정(calibration)해야
   하지만, 여기서는 콘텐츠 난이도에 대한 합리적 사전값(prior)으로 지정했습니다.

   ※ 이 배열은 이제 "폴백용"입니다. 정식 문항 은행은 Supabase의 questions
   테이블에 있고(seed-questions.sql로 이 54개를 그대로 옮겨뒀음 + AI가 계속
   채워넣음), DB 조회가 실패하거나 아직 설정 전이면 이 배열로 대체됩니다. */
const FALLBACK_POOL = [
  // 수열
  { tag: "수열", q: "2, 4, 8, 16, ?", options: ["24", "30", "32", "64"], answer: 2, b: -1.4, a: 1 },
  { tag: "수열", q: "3, 6, 11, 18, ?", options: ["25", "27", "29", "31"], answer: 1, b: -0.2, a: 1 },
  { tag: "수열", q: "1, 4, 9, 16, ?", options: ["20", "24", "25", "36"], answer: 2, b: -1.0, a: 1 },
  { tag: "수열", q: "100, 95, 85, 70, ?", options: ["55", "50", "45", "60"], answer: 1, b: -0.6, a: 1 },
  { tag: "수열", q: "7, 14, 28, 56, ?", options: ["98", "112", "84", "120"], answer: 1, b: -1.2, a: 1 },
  { tag: "수열", q: "1, 2, 6, 24, ?", options: ["48", "96", "120", "72"], answer: 2, b: 0.4, a: 1.1 },
  { tag: "수열", q: "2, 3, 5, 8, 13, ?", options: ["18", "20", "21", "24"], answer: 2, b: 0.1, a: 1 },
  { tag: "수열", q: "1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "15"], answer: 2, b: -0.3, a: 1 },
  { tag: "수열", q: "81, 64, 49, 36, ?", options: ["24", "25", "28", "30"], answer: 1, b: 0.2, a: 1 },
  { tag: "수열", q: "3, 6, 12, 24, ?", options: ["36", "42", "48", "54"], answer: 2, b: -1.3, a: 1 },
  // 연산
  { tag: "연산", q: "12 + 13 × 2 = ?", options: ["38", "50", "42", "26"], answer: 0, b: -1.6, a: 0.9 },
  { tag: "연산", q: "10,000원의 30% 는?", options: ["2,000", "2,500", "3,000", "3,500"], answer: 2, b: -1.5, a: 0.9 },
  { tag: "연산", q: "가장 큰 값은?", options: ["2³", "3²", "4¹", "5⁰"], answer: 1, b: -0.4, a: 1 },
  { tag: "연산", q: "48 ÷ 6 + 7 × 2 = ?", options: ["20", "22", "24", "18"], answer: 1, b: -0.8, a: 0.9 },
  { tag: "연산", q: "15의 40% + 8 = ?", options: ["12", "14", "16", "18"], answer: 1, b: -0.5, a: 0.9 },
  { tag: "연산", q: "3² + 4² = ?", options: ["20", "25", "49", "7"], answer: 1, b: -1.1, a: 0.9 },
  // 논리
  { tag: "논리", q: "성격이 다른 하나는? (2, 3, 9, 11)", options: ["2", "3", "9", "11"], answer: 2, b: 0.0, a: 1.15 },
  { tag: "논리", q: "다른 하나는? (사자·호랑이·독수리·표범)", options: ["사자", "호랑이", "독수리", "표범"], answer: 2, b: -1.0, a: 1.1 },
  { tag: "논리", q: "다른 하나는? (당근·감자·양파·사과)", options: ["당근", "감자", "양파", "사과"], answer: 3, b: -0.9, a: 1.1 },
  { tag: "논리", q: "다른 하나는? (원·삼각형·정사각형·정육면체)", options: ["원", "삼각형", "정사각형", "정육면체"], answer: 3, b: -0.3, a: 1.1 },
  { tag: "논리", q: "A>B, B>C 이면?", options: ["A<C", "A>C", "A=C", "알 수 없다"], answer: 1, b: -0.7, a: 1.1 },
  { tag: "논리", q: "모든 A는 B다. 어떤 B는 C다. 반드시 참인 것은?", options: ["모든 A는 C다", "어떤 A는 C다", "A가 C인지 알 수 없다", "C는 모두 A다"], answer: 2, b: 1.3, a: 1.2 },
  // 언어유추
  { tag: "언어", q: "낮 : 밤  =  여름 : ?", options: ["겨울", "봄", "가을", "아침"], answer: 0, b: -1.7, a: 0.9 },
  { tag: "언어", q: "시계 : 시간  =  온도계 : ?", options: ["무게", "온도", "속도", "거리"], answer: 1, b: -1.4, a: 0.9 },
  { tag: "언어", q: "손 : 장갑  =  발 : ?", options: ["양말", "신발", "구두", "깔창"], answer: 0, b: -0.6, a: 0.9 },
  { tag: "언어", q: "의사 : 병원  =  교사 : ?", options: ["학교", "교실", "책", "학생"], answer: 0, b: -1.5, a: 0.9 },
  { tag: "언어", q: "책 : 저자  =  그림 : ?", options: ["화가", "붓", "미술관", "물감"], answer: 0, b: -0.5, a: 0.9 },
  { tag: "언어", q: "물 : 갈증  =  음식 : ?", options: ["허기", "포만", "요리", "식당"], answer: 0, b: -0.2, a: 0.9 },
  // 문자열
  { tag: "문자", q: "B, D, G, K, ?", options: ["N", "O", "P", "Q"], answer: 2, b: 0.7, a: 1 },
  { tag: "문자", q: "Z, W, S, N, ?", options: ["H", "I", "J", "K"], answer: 0, b: 0.9, a: 1 },
  { tag: "문자", q: "A, C, F, J, ?", options: ["M", "N", "O", "P"], answer: 2, b: 0.6, a: 1 },
  { tag: "문자", q: "B, E, H, K, ?", options: ["L", "M", "N", "O"], answer: 2, b: -0.4, a: 1 },
  { tag: "문자", q: "AZ, BY, CX, ?", options: ["DW", "DV", "EW", "DX"], answer: 0, b: 0.5, a: 1 },
  // 추론/규칙
  { tag: "추론", q: "규칙: 1→1, 2→4, 3→9, 4→?", options: ["12", "14", "16", "20"], answer: 2, b: -0.6, a: 1.1 },
  { tag: "추론", q: "2, 4, 3, 9, 4, 16, 5, ?", options: ["20", "25", "30", "36"], answer: 1, b: 1.1, a: 1.2 },
  { tag: "추론", q: "규칙: 2→6, 3→12, 4→20, 5→?", options: ["25", "30", "28", "35"], answer: 1, b: 1.0, a: 1.2 },
  // 공간/도형
  { tag: "공간", q: "정육면체의 면은 몇 개?", options: ["4", "6", "8", "12"], answer: 1, b: -1.9, a: 0.8 },
  { tag: "공간", q: "삼각형 내각의 합은?", options: ["90도", "180도", "270도", "360도"], answer: 1, b: -1.8, a: 0.8 },
  { tag: "공간", q: "시계가 3시일 때 시침과 분침의 각도는?", options: ["60도", "90도", "120도", "45도"], answer: 1, b: -0.3, a: 0.9 },
  { tag: "공간", q: "정오각형의 꼭짓점은 몇 개?", options: ["4", "5", "6", "10"], answer: 1, b: -1.6, a: 0.8 },
  // 작업기억 (신규 카테고리)
  { tag: "기억", q: "다음을 거꾸로 나열하면? 3, 7, 1, 9", options: ["9,1,7,3", "3,7,1,9", "1,3,7,9", "9,7,3,1"], answer: 0, b: -0.3, a: 1 },
  { tag: "기억", q: "다음 중 두 번째로 큰 수는? 14, 39, 27, 8", options: ["39", "27", "14", "8"], answer: 1, b: -0.2, a: 1 },
  { tag: "기억", q: "순서대로 기억: 6-2-9-4-1. 세 번째 숫자는?", options: ["6", "2", "9", "4"], answer: 2, b: 0.3, a: 1.1 },
  { tag: "기억", q: "다음 목록에서 짝수의 개수는? 3, 8, 11, 6, 15, 4", options: ["2", "3", "4", "5"], answer: 1, b: 0.4, a: 1.1 },
  { tag: "기억", q: "A=3, B=A+2, C=B×2 일 때 C의 값은?", options: ["8", "10", "12", "14"], answer: 1, b: 0.6, a: 1.2 },
  { tag: "기억", q: "다섯 자리 15948 중 세 번째 숫자는?", options: ["1", "5", "9", "4"], answer: 2, b: -0.5, a: 1 },
  { tag: "기억", q: "단어 목록 '사과-기차-우산-바다' 에서 두 번째로 제시된 단어는?", options: ["사과", "기차", "우산", "바다"], answer: 1, b: -0.4, a: 1 },
  { tag: "기억", q: "숫자 7-3-9-2-5-1 중 짝수만 순서대로 나열하면?", options: ["2,5", "9,2", "7,2", "3,2"], answer: 2, b: 1.0, a: 1.2 },
  // 추가 난이도 확보용 (쉬움/매우 어려움)
  { tag: "수열", q: "5, 10, 15, 20, ?", options: ["22", "24", "25", "28"], answer: 2, b: -2.0, a: 0.8 },
  { tag: "연산", q: "8 + 4 = ?", options: ["10", "11", "12", "13"], answer: 2, b: -2.1, a: 0.7 },
  { tag: "논리", q: "다음 명제 중 항상 참인 것은? '모든 짝수는 2의 배수이다'는 어떤 명제 유형인가?", options: ["항진명제", "모순명제", "우연명제", "무의미명제"], answer: 0, b: 1.7, a: 1.2 },
  { tag: "추론", q: "규칙: f(n) = f(n-1) + f(n-2) - 1, f(1)=1, f(2)=2 일 때 f(4)는?", options: ["3", "4", "5", "6"], answer: 1, b: 1.8, a: 1.2 },
  { tag: "공간", q: "정십이면체의 면은 몇 개?", options: ["8", "10", "12", "20"], answer: 2, b: 1.4, a: 1 },
  { tag: "문자", q: "다음 규칙에서 빠진 것은? CE, FH, IK, ?", options: ["LN", "LM", "KM", "LO"], answer: 0, b: 1.6, a: 1.1 },
];
const POOL = FALLBACK_POOL.map((q, i) => ({ ...q, id: `fb-${i}` }));
const FOE_NAMES = ["논리왕_민준", "퀀트_소피아", "두뇌풀가동", "IQ장인_현우", "패턴헌터", "수열의神", "로직마스터", "띵킹머신"];
const STAKES = [100, 300, 500, 1000];
const Q_PER_MATCH = 8;
const Q_TIME = 15;
const TOTAL_PLAYERS = 1284502;
const AVG_REACTION = 6.8, PRO_REACTION = 4.0; // 비교 기준(초)
const MAX_HEARTS = 3;        // 무료 연속 3판
const HEART_REGEN = 30 * 60; // 30분당 1개 회복(초)
const PASSES = [
  { id: "day", name: "무제한 1일권", price: 1900, ms: 24 * 3600e3 },
  { id: "month", name: "무제한 월 구독", price: 4900, ms: 30 * 24 * 3600e3 },
];
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const HEART_PRICE_POINTS = 3000; // 포인트로 하트 1개 구매 (포인트의 유일한 용도)

/* ── 아바타 꾸미기: 스킨(색상 테마) · 심볼(뱃지) ──
   포인트는 오직 "하트 구매"에만 씁니다(현금 → 포인트 → 하트, 단방향).
   아바타 꾸미기는 돈이 전혀 오가지 않는 별개 영역이에요:
   - 스킨(색상)은 처음부터 전부 무료로 골라 쓸 수 있음 (순수 취향 선택)
   - 심볼(뱃지)은 레벨을 올리면 자동으로 해금됨 (성취 배지, 구매 불가) */
const AVATAR_SKINS = [
  { id: "default", name: "기본", grad: ["#7c5cff", "#3ee0cf"] },
  { id: "sunset", name: "선셋", grad: ["#ff7a59", "#ffce4d"] },
  { id: "ocean", name: "오션", grad: ["#3ee0cf", "#5b6cff"] },
  { id: "aurora", name: "오로라", grad: ["#a78bfa", "#39d98a"] },
  { id: "rosegold", name: "로즈골드", grad: ["#fb5c7d", "#ffce4d"] },
  { id: "mono", name: "모노크롬", grad: ["#3a3a46", "#8c80b5"] },
  { id: "royal", name: "로열골드", grad: ["#f5a623", "#ffce4d"] },
  { id: "void", name: "보이드", grad: ["#0b0818", "#7c5cff"] },
];
const BADGES = [
  { id: "none", name: "없음", minLevel: 0, emoji: null },
  { id: "brain", name: "브레인", minLevel: 5, emoji: "🧠" },
  { id: "bolt", name: "번개", minLevel: 10, emoji: "⚡" },
  { id: "crown", name: "왕관", minLevel: 15, emoji: "👑" },
  { id: "fire", name: "파이어", minLevel: 20, emoji: "🔥" },
  { id: "star", name: "별", minLevel: 25, emoji: "⭐" },
  { id: "diamond", name: "다이아", minLevel: 30, emoji: "💎" },
  { id: "skull", name: "해골", minLevel: 40, emoji: "💀" },
];
const POINT_PACKS = [
  { id: "p500", amount: 500, price: 1000 },
  { id: "p1500", amount: 1500, price: 2500 },
  { id: "p3500", amount: 3500, price: 5000 },
  { id: "p8000", amount: 8000, price: 10000 },
];
const skinOf = (id) => AVATAR_SKINS.find((s) => s.id === id) || AVATAR_SKINS[0];
const skinGrad = (id) => { const s = skinOf(id); return `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})`; };
const badgeOf = (id) => BADGES.find((b) => b.id === id) || BADGES[0];

/* ── 카카오 로그인 + Supabase 데이터 레이어 ──
   개인 데이터(profiles)는 카카오 계정에 연결되어 어느 기기에서 로그인해도 이어집니다.
   경기 기록(match_logs)은 전체 유저가 공유하는 테이블이라, 그 데이터로 실제
   유저 기반 랭킹(leaderboard 뷰)과 고스트 대결을 만듭니다.
   테이블 정의: supabase-schema.sql · 로그인 검증 서버: kakao-auth-function.ts

   ※ @supabase/supabase-js 같은 npm 클라이언트 라이브러리는 Claude 아티팩트
   미리보기가 지원하는 라이브러리 목록에 없어서 그대로 쓰면 "지원되지 않는
   라이브러리" 오류가 납니다. 그래서 클라이언트 라이브러리 없이 Supabase가
   테이블마다 자동으로 열어주는 REST API(PostgREST)를 fetch()로 직접
   호출합니다 — fetch는 브라우저 표준 기능이라 아티팩트에서도 제한 없이
   동작하고, 실제 배포 환경에서도 동일하게 작동합니다. */
function getAuthToken() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || null; } catch { return null; }
}
async function sbFetch(path, { method = "GET", body } = {}) {
  const token = getAuthToken() || SUPABASE_ANON_KEY; // 로그인 전에는 익명 권한으로 조회
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      ...(method !== "GET" ? { Prefer: "return=representation" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path} 실패: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
function initKakao() {
  if (typeof window !== "undefined" && window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
  }
}
function loginWithKakao() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.Kakao) { reject(new Error("카카오 SDK가 로드되지 않았습니다. index.html의 스크립트 태그를 확인하세요.")); return; }
    initKakao();
    window.Kakao.Auth.login({
      success: async (authObj) => {
        try {
          const res = await fetch(SUPABASE_FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ kakaoAccessToken: authObj.access_token }),
          });
          const { token, profile, error } = await res.json();
          if (error) throw new Error(error);
          localStorage.setItem(SESSION_KEY, JSON.stringify({ token, profileId: profile.id }));
          resolve(profile);
        } catch (e) { reject(e); }
      },
      fail: (err) => reject(err),
    });
  });
}
function logoutKakao() {
  localStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined" && window.Kakao?.Auth?.logout) window.Kakao.Auth.logout();
}

/* ============================================================
   Google Play 인앱결제 (cordova-plugin-purchase / CdvPurchase)
   ------------------------------------------------------------
   - 이 플러그인은 네이티브(안드로이드 앱) 안에서만 동작합니다.
     (Chrome 미리보기·웹 배포본에서는 window.CdvPurchase가 없음)
   - 우리 상품 id(report1, report2, adfree, pass:day, pass:month)를
     Google Play Console에 실제로 등록한 상품 id(PLAY_PRODUCT_IDS)로 매핑합니다.
     Play Console에 반드시 아래 값과 "정확히 같은" 상품 id로 등록하세요.
   - 결제 자체는 여기서 끝나는 게 아니라, 구매 후 받은 purchaseToken을
     confirm-purchase Edge Function으로 보내 서버가 구글에 재검증한 뒤에만
     owned/unlimited_until이 실제로 반영됩니다 (클라이언트 신뢰 X).
   ============================================================ */
const PLAY_PRODUCT_IDS = {
  report1: "iqbattle_report1",
  report2: "iqbattle_report2",
  adfree: "iqbattle_adfree_month",
  "pass:day": "iqbattle_pass_day",
  "pass:month": "iqbattle_pass_month",
};
let __billingReady = null; // Promise<boolean> — store.initialize 완료 여부
function isNativeBilling() {
  return typeof window !== "undefined" && !!window.CdvPurchase;
}
function initPlayBilling() {
  if (__billingReady) return __billingReady;
  __billingReady = new Promise((resolve) => {
    if (!isNativeBilling()) { resolve(false); return; }
    const { store, ProductType, Platform } = window.CdvPurchase;
    const ids = Object.values(PLAY_PRODUCT_IDS);
    store.register(ids.map((id) => ({ id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
    store.error((err) => console.error("[PlayBilling]", err));
    store.initialize([Platform.GOOGLE_PLAY]).then(() => resolve(true)).catch(() => resolve(false));
  });
  return __billingReady;
}
// item("report1" 등) → 실제 구매 진행 → 서버 검증까지 마친 뒤 profile을 resolve.
// 실패하면 reject(Error). 네이티브 앱이 아니면 즉시 reject.
function purchaseViaPlayBilling(item, authToken) {
  return new Promise(async (resolve, reject) => {
    const ok = await initPlayBilling();
    if (!ok) { reject(new Error("이 결제는 안드로이드 앱 안에서만 가능해요.")); return; }
    const { store } = window.CdvPurchase;
    const productId = PLAY_PRODUCT_IDS[item];
    if (!productId) { reject(new Error(`알 수 없는 상품: ${item}`)); return; }
    const offer = store.get(productId)?.getOffer();
    if (!offer) { reject(new Error("상품 정보를 아직 불러오지 못했어요. 잠시 후 다시 시도해주세요.")); return; }

    const onApproved = async (transaction) => {
      if (!transaction.products.some((p) => p.id === productId)) return;
      try {
        const purchaseToken = transaction.nativePurchase?.purchaseToken || transaction.purchaseId;
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/confirm-purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ item, purchaseToken }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        await transaction.finish(); // 서버 확인 후에만 finish (그 전엔 영수증을 계속 재사용 가능한 상태로 둠)
        resolve(data.profile);
      } catch (e) {
        reject(e); // finish() 호출 안 함 → 다음 실행 시 store가 다시 approved를 보내 재시도 가능
      }
    };
    store.when().approved(onApproved);
    store.order(offer).catch((e) => reject(new Error(e?.message || "결제가 취소되었거나 실패했어요.")));
  });
}
function getStoredProfileId() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.profileId || null; } catch { return null; }
}
async function loadProfile(profileId) {
  try {
    const rows = await sbFetch(`profiles?id=eq.${profileId}&select=*`);
    return rows?.[0] || null;
  } catch { return null; }
}
async function saveProfile(profileId, patch) {
  try {
    await sbFetch(`profiles?id=eq.${profileId}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  } catch { /* 저장 실패는 무시 (다음 저장에서 재시도) */ }
}
async function loadGhostPool(myRating, myProfileId) {
  try {
    const lo = myRating - 160, hi = myRating + 160;
    const rows = await sbFetch(
      `match_logs?select=nickname,rating_after,response_log&rating_after=gte.${lo}&rating_after=lte.${hi}&profile_id=neq.${myProfileId || "00000000-0000-0000-0000-000000000000"}&order=created_at.desc&limit=30`
    );
    return (rows || []).map((r) => ({ nick: r.nickname, rating: r.rating_after, log: r.response_log }));
  } catch { return []; }
}
async function saveMatchLog(profileId, record) {
  try {
    await sbFetch(`match_logs`, {
      method: "POST",
      body: {
        profile_id: profileId, nickname: record.nick, rating_after: record.rating,
        result: record.result, iq: record.iq, theta: record.theta, se: record.se,
        response_log: record.log,
      },
    });
  } catch { /* 공유 저장 실패는 게임 진행에 영향 없이 무시 */ }
}
async function loadLeaderboard() {
  try {
    const rows = await sbFetch(`rpc/get_leaderboard`, { method: "POST", body: {} });
    return (rows || []).map((r) => ({ nick: r.nickname, rating: r.rating, iq: r.iq, ts: r.updated_at }));
  } catch { return []; }
}

/* ── 문항 은행 (Supabase questions 테이블) ──
   DB 조회가 실패하거나(아직 스키마/시드 실행 전 등) 결과가 비어 있으면
   FALLBACK_POOL(POOL)로 자동 대체되어 게임은 계속 정상 작동합니다. */
async function loadQuestionBank() {
  try {
    const rows = await sbFetch(`questions?select=id,tag,q,options,answer,b,a&active=eq.true&limit=1000`);
    if (!rows || !rows.length) return null;
    return rows.map((r) => ({ id: r.id, tag: r.tag, q: r.q, options: r.options, answer: r.answer, b: r.b, a: r.a }));
  } catch { return null; }
}
// AI로 새 문항을 생성해 DB에 채워넣기 요청 (실패해도 게임에 영향 없이 조용히 무시 —
// 다음 접속 때 다시 시도하면 됩니다. await 하지 말고 fire-and-forget으로 호출하세요.)
async function requestMoreQuestions(tag, targetB, count = 6) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ tag, targetB, count }),
    });
  } catch { /* 조용히 무시 */ }
}

/* ── IRT (2PL) 능력치 추정 ──
   실서비스 CAT(적응형 검사)와 동일한 방식으로 뉴턴-랩슨을 쓰되, 순수 최대우도
   추정(MLE)이 아니라 θ~N(0,1) 사전분포를 반영한 베이지안 최대사후추정(MAP)을
   씁니다. 순수 MLE는 응답이 모두 정답(또는 모두 오답)이면 로그우도가 한쪽으로
   단조증가/감소만 해서 유한한 해가 존재하지 않고 ±4 경계로 발산하는 문제가
   있었는데(응답 1~2개일 때 특히 심함), 사전분포를 더하면 언제나 유한하고
   안정적인 추정치가 나옵니다 — 능형회귀(ridge regression)에서 정규화 항을
   더하는 것과 같은 원리입니다. */
function pIRT(theta, b, a = 1) { return 1 / (1 + Math.exp(-a * (theta - b))); }
const THETA_PRIOR_VAR = 1; // θ ~ N(0, 1) : IQ 환산 시 1 표준편차 = 15점, 실제 IQ 검사의 SD 15와 일치
function estimateTheta(responses) {
  if (!responses.length) return 0;
  let theta = 0;
  for (let iter = 0; iter < 30; iter++) {
    let num = -theta / THETA_PRIOR_VAR, den = 1 / THETA_PRIOR_VAR; // 사전분포의 1차/2차 미분 항
    responses.forEach((r) => {
      const p = pIRT(theta, r.b, r.a);
      num += r.a * (r.correct - p);
      den += r.a * r.a * p * (1 - p);
    });
    if (den < 1e-6) break;
    const step = num / den;
    theta += step;
    theta = Math.max(-4, Math.min(4, theta));
    if (Math.abs(step) < 1e-4) break;
  }
  return theta;
}
function fisherSE(responses, theta) {
  let info = 1 / THETA_PRIOR_VAR; // 사전분포의 정보량을 기본으로 포함 (응답 0개일 때도 유한한 SE)
  responses.forEach((r) => { const p = pIRT(theta, r.b, r.a); info += r.a * r.a * p * (1 - p); });
  return info > 1e-6 ? 1 / Math.sqrt(info) : 2.5;
}
function pickAdaptive(pool, usedIds, theta) {
  const cands = pool.filter((q) => !usedIds.has(q.id));
  if (!cands.length) return pool[Math.floor(Math.random() * pool.length)];
  const sorted = [...cands].sort((x, y) => Math.abs(x.b - theta) - Math.abs(y.b - theta));
  const top = sorted.slice(0, Math.min(6, sorted.length));
  return top[Math.floor(Math.random() * top.length)];
}
const TAGS = ["수열", "연산", "논리", "언어", "문자", "추론", "공간", "기억"];
let topUpInFlight = false; // 같은 세션에서 요청이 겹치지 않도록 간단한 락
function maybeTopUpBank(bank, theta) {
  if (topUpInFlight) return;
  const nearby = bank.filter((q) => Math.abs(q.b - theta) < 0.75);
  if (nearby.length >= 12) return; // 근처 난이도 후보가 충분하면 그냥 둠
  topUpInFlight = true;
  const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
  requestMoreQuestions(tag, theta, 6).finally(() => { topUpInFlight = false; });
}
function diffLabel(b) {
  const n = b < -1.1 ? 1 : b < -0.3 ? 2 : b < 0.5 ? 3 : b < 1.2 ? 4 : 5;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

const tierOf = (r) => r < 1100 ? { name: "브론즈", color: "#c98d5b" } : r < 1300 ? { name: "실버", color: "#c7ccda" } : r < 1500 ? { name: "골드", color: C.gold } : r < 1700 ? { name: "플래티넘", color: "#5ee0d0" } : { name: "다이아", color: "#8ab6ff" };
const rand = (a, b) => a + Math.random() * (b - a);
const cdf = (z) => 1 / (1 + Math.exp(-1.702 * z));
const pctlOf = (iq) => { const p = cdf((iq - 100) / 15) * 100; return { top: Math.max(0.1, Math.round((100 - p) * 10) / 10), rank: Math.max(1, Math.round((TOTAL_PLAYERS * (100 - p)) / 100)) }; };

/* ── 아이콘 ── */
const I = {
  home: (c) => <path d="M3 11l9-8 9 8M5 10v10h14V10" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />,
  trophy: (c) => <path d="M7 4h10v4a5 5 0 01-10 0V4zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 15h6M12 13v2M8 20h8M10 20v-2h4v2" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />,
  target: (c) => <><circle cx="12" cy="12" r="8" fill="none" stroke={c} strokeWidth="1.6" /><circle cx="12" cy="12" r="3.4" fill="none" stroke={c} strokeWidth="1.6" /></>,
  bag: (c) => <path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />,
  lock: (c) => <path d="M7 11V8a5 5 0 0110 0v3M5 11h14v9H5z" fill="none" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />,
  bolt: (c) => <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={c} />,
  heart: (c, fill) => <path d="M12 20.5C12 20.5 4 14.5 4 9a4 4 0 018-1 4 4 0 018 1c0 5.5-8 11.5-8 11.5z" fill={fill ? c : "none"} stroke={c} strokeWidth="1.6" strokeLinejoin="round" />,
  info: (c) => <><circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="1.6" /><path d="M12 11v5M12 7.6h.01" stroke={c} strokeWidth="1.9" strokeLinecap="round" /></>,
  sparkle: (c) => <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill={c} />,
};
const Ico = ({ name, c = "currentColor", s = 22 }) => <svg width={s} height={s} viewBox="0 0 24 24">{I[name](c)}</svg>;
const Coin = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill={C.gold} stroke={C.goldDeep} strokeWidth="1.5" /><text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#7a4d00">P</text></svg>;
const Heart = ({ s = 18, on = true }) => <svg width={s} height={s} viewBox="0 0 24 24">{I.heart(on ? C.foe : C.muted, on)}</svg>;

function Btn({ children, onClick, kind = "primary", style, disabled }) {
  const base = { border: "none", borderRadius: 15, padding: "15px 20px", fontFamily: FONT, fontSize: 16, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, transition: "transform .12s, filter .12s", color: "#170c33" };
  const kinds = {
    primary: { background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, boxShadow: "0 8px 22px rgba(245,166,35,0.28)" },
    battle: { background: `linear-gradient(135deg, ${C.indigo}, ${C.me})`, color: "#08121a", boxShadow: "0 8px 24px rgba(91,108,255,0.4)" },
    ghost: { background: "rgba(255,255,255,0.04)", color: C.violet, border: `1.5px solid ${C.line}` },
    ai: { background: `linear-gradient(135deg, #7c5cff, #3ee0cf)`, color: "#08121a", boxShadow: "0 8px 22px rgba(124,92,255,0.35)" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...kinds[kind], ...style }}
    onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>{children}</button>;
}
const Card = ({ children, style, glow }) => (
  <div style={{ background: `linear-gradient(160deg, ${C.cardTop}, ${C.card})`, border: `1px solid ${C.line}`, borderRadius: 22, boxShadow: glow ? C.glow : C.shadow, backdropFilter: "blur(6px)", ...style }}>{children}</div>
);
const Avatar = ({ color, label, s = 44, badgeEmoji }) => (
  <div style={{ position: "relative", width: s, height: s, flexShrink: 0 }}>
    <div style={{ width: s, height: s, borderRadius: 14, background: color, display: "grid", placeItems: "center", fontWeight: 900, fontSize: s * 0.4, color: "#08121a", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.35)" }}>{label}</div>
    {badgeEmoji && <span style={{ position: "absolute", right: -4, bottom: -4, fontSize: Math.max(12, s * 0.36), lineHeight: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>{badgeEmoji}</span>}
  </div>
);

/* ── IQ 추이 라인차트 ── */
function IQChart({ data }) {
  const W = 400, H = 130, pad = 22;
  const min = Math.min(...data) - 6, max = Math.max(...data) + 6;
  const x = (i) => pad + (i * (W - pad * 2)) / (data.length - 1);
  const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
      <defs>
        <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.me} stopOpacity="0.35" /><stop offset="1" stopColor={C.me} stopOpacity="0" /></linearGradient>
      </defs>
      <polygon points={area} fill="url(#ig)" />
      <polyline points={line} fill="none" stroke={C.me} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === data.length - 1 ? 5 : 3} fill={i === data.length - 1 ? C.gold : C.me} />)}
      <text x={W - pad} y={y(data[data.length - 1]) - 10} textAnchor="end" fontSize="15" fontWeight="800" fill={C.gold} fontFamily={FONT}>{data[data.length - 1]}</text>
    </svg>
  );
}
const Bar = ({ label, pct, val, color }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
      <span style={{ color: C.sub, fontWeight: 700 }}>{label}</span><span style={{ color, fontWeight: 800 }}>{val}</span>
    </div>
    <div style={{ height: 9, background: "rgba(0,0,0,0.3)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}aa, ${color})`, borderRadius: 99 }} />
    </div>
  </div>
);

/* ============================================================ */
function App() {
  const [screen, setScreen] = useState("home");
  const [points, setPoints] = useState(5000);
  const [rating, setRating] = useState(1240);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(7);
  const [xp, setXp] = useState(140);
  const [owned, setOwned] = useState({});
  const [equippedSkin, setEquippedSkin] = useState("default");
  const [equippedBadge, setEquippedBadge] = useState("none");
  const [modal, setModal] = useState(null);
  const [levelUp, setLevelUp] = useState(null);

  // 에너지(하트) 시스템
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [regen, setRegen] = useState(HEART_REGEN);   // 다음 하트까지(초)
  const [unlimitedUntil, setUnlimitedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [adState, setAdState] = useState(null);       // null|'playing'
  const [events, setEvents] = useState([]);           // 이벤트 추적 로그
  const [showMetrics, setShowMetrics] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const visited = useRef(false);
  const [account, setAccount] = useState(null);        // { nick }
  const [booted, setBooted] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [guestMatchDone, setGuestMatchDone] = useState(false); // 로그인 없이 1판 체험 완료 여부
  const unlimited = unlimitedUntil > now;

  const [mprog, setMprog] = useState({ play: 1, streak: 0, iq: 0 });
  const [mclaim, setMclaim] = useState({ play: false, streak: false, iq: false });
  const MISSIONS = [
    { id: "play", label: "대결 3회 완료", goal: 3, reward: 300 },
    { id: "streak", label: "3연승 달성", goal: 3, reward: 500 },
    { id: "iq", label: "대결에서 IQ 130 돌파", goal: 1, reward: 800 },
  ];

  const [stake, setStake] = useState(300);
  const [foe, setFoe] = useState(null);
  const [qs, setQs] = useState([]);
  const [bqi, setBqi] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [foeScore, setFoeScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [foePicked, setFoePicked] = useState(null);
  const [tleft, setTleft] = useState(Q_TIME);
  const [outcome, setOutcome] = useState(null);
  const [liveIQ, setLiveIQ] = useState(100);
  const [live, setLive] = useState({ top: 50, rank: 640000 });
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState(null);

  // 리포트용 데이터
  const [iqHistory, setIqHistory] = useState([112, 119, 116, 124, 121]);
  const [lastLog, setLastLog] = useState([]);
  const [catAgg, setCatAgg] = useState({}); // 누적 유형별 정답
  const [recentQuestionIds, setRecentQuestionIds] = useState([]); // 최근 본 문항 id (반복 방지)

  // 공유 랭킹
  const [liveBoard, setLiveBoard] = useState([]);

  const R = useRef({ correct: 0, answered: 0, time: 0, fCorrect: 0, fTime: 0, combo: 0, maxIQ: 100, bestStreak: 0, log: [], responses: [], qs: [], foe: null, qLock: -1 });
  const qStart = useRef(0), qTimer = useRef(null);
  const matchSetupRef = useRef({ foe: null, firstQ: null });
  const bankRef = useRef(POOL); // DB 조회 전까지는 폴백 풀 사용
  const recentIdsRef = useRef([]); // recentQuestionIds를 타이머 체인에서도 안전하게 읽기 위한 ref
  const tier = tierOf(rating);
  const nextTierGap = rating < 1100 ? 1100 - rating : rating < 1300 ? 1300 - rating : rating < 1500 ? 1500 - rating : rating < 1700 ? 1700 - rating : null;

  const [board] = useState(() => {
    const names = ["멘사킹", "0.1%두뇌", "논리괴물", "패턴제왕", "수열도사", "IQ168", "추론의神", "브레인캐리"];
    return names.map((n, i) => ({ name: n, rating: 2380 - i * 55 - Math.round(rand(0, 20)), iq: 158 - i * 3 })).sort((a, b) => b.rating - a.rating);
  });

  // 1초 틱: 하트 회복 + 무제한 만료 계산
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setHearts((h) => {
        if (h >= MAX_HEARTS) { setRegen(HEART_REGEN); return h; }
        setRegen((s) => {
          if (s <= 1) { setHearts((hh) => Math.min(MAX_HEARTS, hh + 1)); return HEART_REGEN; }
          return s - 1;
        });
        return h;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── 이벤트 추적 ──
  // 실서비스에선 이 한 곳만 GA4(gtag) / PostHog로 연결하면 전체 퍼널이 잡힙니다.
  function track(name, props = {}) {
    setEvents((e) => [...e, { name, props, t: Date.now() }]);
    if (typeof window !== "undefined") {
      if (window.posthog) window.posthog.capture(name, props);
      if (window.gtag) window.gtag("event", name, props);
    }
  }
  useEffect(() => { if (!visited.current) { visited.current = true; track("visit"); } }, []);

  // 카카오 SDK 동적 로드 (index.html을 직접 못 건드리는 배포 환경에서도 바로 동작하도록)
  useEffect(() => {
    if (typeof window === "undefined" || window.Kakao) return;
    const s = document.createElement("script");
    s.src = "https://developers.kakao.com/sdk/js/kakao.js";
    s.async = true;
    s.onload = () => initKakao();
    document.head.appendChild(s);
  }, []);

  // Google Play 인앱결제 스토어 초기화 (안드로이드 앱 안에서만 실제로 붙음)
  useEffect(() => { initPlayBilling(); }, []);

  // 문항 은행: Supabase questions 테이블에서 불러오고, 실패/공백이면 폴백 풀 유지
  useEffect(() => {
    loadQuestionBank().then((bank) => { if (bank && bank.length) bankRef.current = bank; });
  }, []);

  // recentQuestionIds를 ref에도 동기화 (타이머 체인에서 stale closure 없이 항상 최신값을 읽기 위함)
  useEffect(() => { recentIdsRef.current = recentQuestionIds; }, [recentQuestionIds]);

  // 부팅: 저장된 카카오 세션이 있으면 Supabase에서 프로필 복원 (+ 오프라인 하트 회복)
  useEffect(() => {
    (async () => {
      const pid = getStoredProfileId();
      if (pid) {
        const p = await loadProfile(pid);
        if (p) {
          applyProfileToState(p);
          setAccount({ id: p.id, nick: p.nickname });
        } else {
          logoutKakao(); // 세션은 있는데 프로필 조회가 실패하면 로그인 상태 정리
        }
      }
      setBooted(true);
    })();
  }, []);

  function applyProfileToState(p) {
    setRating(p.rating ?? 1240); setLevel(p.level ?? 1); setXp(p.xp ?? 0);
    setPoints(p.points ?? 5000); setStreak(p.streak ?? 0);
    setIqHistory(p.iq_history ?? [112, 119, 116, 124, 121]); setCatAgg(p.cat_agg ?? {});
    setOwned(p.owned ?? {}); setUnlimitedUntil(p.unlimited_until ? new Date(p.unlimited_until).getTime() : 0);
    setEquippedSkin(p.equipped_skin ?? "default"); setEquippedBadge(p.equipped_badge ?? "none");
    setRecentQuestionIds(p.recent_question_ids ?? []);
    const lastSeen = p.updated_at ? new Date(p.updated_at).getTime() : Date.now();
    const elapsed = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));
    setHearts(Math.min(MAX_HEARTS, (p.hearts ?? MAX_HEARTS) + Math.floor(elapsed / HEART_REGEN)));
    setRegen(HEART_REGEN);
  }

  // 저장: 주요 지표가 바뀔 때마다 스냅샷 (부팅 완료 & 로그인 상태에서만)
  // ※ owned·unlimited_until은 여기서 절대 보내지 않습니다. DB 쪽 컬럼 권한에서
  // 이 두 개를 authenticated 롤의 UPDATE 대상에서 뺐기 때문에(구매는
  // confirm-purchase Edge Function만 수정), 여기서 같이 보내면 그 요청
  // 전체가 거부됩니다.
  useEffect(() => {
    if (!booted || !account) return;
    saveProfile(account.id, {
      rating, level, xp, points, streak,
      iq_history: iqHistory, cat_agg: catAgg,
      equipped_skin: equippedSkin, equipped_badge: equippedBadge,
      recent_question_ids: recentQuestionIds,
      hearts, last_iq: iqHistory[iqHistory.length - 1],
    });
  }, [booted, account, rating, level, xp, points, streak, iqHistory, catAgg, equippedSkin, equippedBadge, recentQuestionIds, hearts]);

  // 랭킹 화면 진입 시 공유 랭킹보드 불러오기
  useEffect(() => {
    if (screen !== "leaderboard") return;
    let live = true;
    loadLeaderboard().then((rows) => { if (live) setLiveBoard(rows); });
    return () => { live = false; };
  }, [screen]);

  async function handleKakaoLogin() {
    setLoginError(null); setLoggingIn(true);
    try {
      const profile = await loginWithKakao();
      applyProfileToState(profile);
      setAccount({ id: profile.id, nick: profile.nickname });
      track("signup", { nick: profile.nickname });
      setScreen("home");
    } catch (e) {
      setLoginError(e?.message || "카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoggingIn(false);
    }
  }
  function logout() { logoutKakao(); setAccount(null); setScreen("home"); }
  async function resetAll() {
    // owned·unlimited_until(결제 관련)은 여기서 손대지 않습니다 — 돈 주고 산
    // 프리미엄 리포트·이용권이 "진행 기록 초기화" 버튼으로 사라지면 안 되고,
    // 애초에 이 두 컬럼은 클라이언트 권한으로 수정할 수도 없습니다.
    if (account?.id) {
      await saveProfile(account.id, {
        rating: 1240, level: 1, xp: 0, points: 5000, streak: 0,
        iq_history: [112, 119, 116, 124, 121], cat_agg: {},
        equipped_skin: "default", equipped_badge: "none", recent_question_ids: [],
        hearts: MAX_HEARTS,
      });
    }
    logoutKakao();
    setRating(1240); setLevel(1); setXp(0); setPoints(5000); setStreak(0);
    setIqHistory([112, 119, 116, 124, 121]); setCatAgg({});
    setEquippedSkin("default"); setEquippedBadge("none"); setRecentQuestionIds([]);
    setHearts(MAX_HEARTS); setRegen(HEART_REGEN); setAccount(null); setScreen("home");
  }

  const canPlay = () => unlimited || hearts > 0;
  function toPaywall(depleted) { if (depleted) track("hearts_depleted"); track("paywall_view"); setScreen("outofhearts"); }
  function goStake() {
    if (!account && guestMatchDone) { track("guest_login_gate"); setScreen("needlogin"); return; }
    if (!canPlay()) toPaywall(true); else { track("stake_view"); setScreen("stake"); }
  }

  function startMatch(s) {
    if (!canPlay()) { toPaywall(true); return; }
    if (!unlimited) setHearts((h) => h - 1); // 하트 1개 소모
    track("match_start", { stake: s });
    setStake(s); setScreen("matching");
    const simFoe = { name: FOE_NAMES[Math.floor(rand(0, FOE_NAMES.length))], rating: Math.round(rating + rand(-90, 90)), ghost: null };
    const excluded = new Set(recentIdsRef.current);
    const firstQ = pickAdaptive(bankRef.current, excluded, 0);
    maybeTopUpBank(bankRef.current, 0); // 근처 난이도 후보가 부족하면 조용히 AI 보충 요청
    setFoe(simFoe);
    const t0 = Date.now();
    loadGhostPool(rating, account?.id).then((pool) => {
      const nearby = pool.filter((g) => g.log && g.log.length >= 4);
      let f = simFoe;
      if (nearby.length) {
        const g = nearby[Math.floor(rand(0, nearby.length))];
        f = { name: g.nick, rating: g.rating, ghost: g };
      }
      setFoe(f);
      matchSetupRef.current = { foe: f, firstQ };
      const elapsed = Date.now() - t0;
      setTimeout(() => begin(), Math.max(300, 1800 - elapsed));
    }).catch(() => {
      matchSetupRef.current = { foe: simFoe, firstQ };
      setTimeout(() => begin(), 1800);
    });
  }
  function watchAd() {
    setAdState("playing");
    setTimeout(() => { setHearts((h) => Math.min(MAX_HEARTS, h + 1)); setAdState(null); track("ad_watch"); }, 2500);
  }
  function buyPass(p) {
    if (!account?.id) { setScreen("needlogin"); return; }
    setModal({ item: "pass:" + p.id, price: p.price, ms: p.ms, name: p.name });
  }
  function begin() {
    track("battle_start");
    const setup = matchSetupRef.current;
    R.current = {
      correct: 0, answered: 0, time: 0, fCorrect: 0, fTime: 0, combo: 0, maxIQ: 100,
      bestStreak: R.current.bestStreak, log: [], responses: [],
      qs: [setup.firstQ], foe: setup.foe, qLock: -1,
    };
    setQs(R.current.qs);
    setBqi(0); setMyScore(0); setFoeScore(0); setPicked(null); setFoePicked(null);
    setLiveIQ(100); setLive({ top: 50, rank: 640000 }); setCombo(0); setOutcome(null);
    setAiCoach({ loading: false, data: null, error: null });
    setScreen("battle"); launch(0);
  }
  function launch(idx) {
    // qLock: setInterval/setTimeout 체인이 오래된 렌더의 클로저를 참조해도(React의
    // "stale closure") R.current는 항상 최신 값을 가리키는 하나의 ref라서 안전합니다.
    R.current.qLock = idx;
    setPicked(null); setFoePicked(null); setTleft(Q_TIME); qStart.current = Date.now();
    clearInterval(qTimer.current);
    qTimer.current = setInterval(() => setTleft((t) => { if (t <= 1) { clearInterval(qTimer.current); answer(-1, idx, true); return 0; } return t - 1; }), 1000);
  }
  function answer(choice, idx, timeout = false) {
    const r = R.current;
    if (r.qLock !== idx) return; // 이미 처리된 문항이거나 순서가 안 맞으면 무시 (중복 호출 방지)
    r.qLock = -1;
    clearInterval(qTimer.current);
    const q = r.qs[idx];
    if (!q) return; // 방어적 처리: 문항을 못 찾으면 조용히 무시 (시간초과 시 크래시 방지)
    const spent = timeout ? Q_TIME : (Date.now() - qStart.current) / 1000;
    const meRight = choice === q.answer;
    r.answered++; r.time += spent; if (meRight) r.correct++;
    r.combo = meRight ? r.combo + 1 : 0;
    r.responses.push({ b: q.b, a: q.a || 1, correct: meRight ? 1 : 0 });
    r.log.push({ tag: q.tag, correct: meRight, time: +spent.toFixed(1), b: q.b });
    setPicked(timeout ? -1 : choice); setMyScore(r.correct); setCombo(r.combo);

    // IRT 기반 실시간 능력치(θ) → IQ 환산
    const theta = estimateTheta(r.responses);
    r.maxIQ = Math.max(r.maxIQ, Math.round(100 + 15 * theta));
    const iq = Math.max(55, Math.min(170, Math.round(100 + 15 * theta)));
    setLiveIQ(iq); setLive(pctlOf(iq));

    if (meRight && r.combo >= 2) { const b = r.combo * 10; setPoints((v) => v + b); setFlash({ key: Date.now(), combo: r.combo, bonus: b }); }

    // 상대: 고스트(실제 유저 기록) 있으면 그 기록을 근사 재현, 없으면 레이팅 기반 시뮬레이션
    const foeNow = r.foe;
    let fr, fSpent;
    if (foeNow && foeNow.ghost && foeNow.ghost.log && foeNow.ghost.log.length) {
      const gl = foeNow.ghost.log[idx % foeNow.ghost.log.length];
      fr = !!gl.correct; fSpent = gl.time ?? rand(2.2, Q_TIME - 1);
    } else {
      const p = Math.max(0.4, Math.min(0.9, 0.55 + ((foeNow?.rating ?? 1200) - 1200) / 2000));
      fr = Math.random() < p; fSpent = rand(2.2, Q_TIME - 1);
    }
    r.fTime += fSpent; if (fr) r.fCorrect++;
    setTimeout(() => { setFoePicked(fr ? q.answer : [0, 1, 2, 3].filter((x) => x !== q.answer)[Math.floor(rand(0, 3))]); setFoeScore(r.fCorrect); }, 800);

    setTimeout(() => {
      if (idx + 1 < Q_PER_MATCH) {
        const used = new Set([...r.qs.map((x) => x.id), ...recentIdsRef.current]);
        const nq = pickAdaptive(bankRef.current, used, theta);
        r.qs = [...r.qs, nq];
        setQs(r.qs);
        setBqi(idx + 1); launch(idx + 1);
      } else settle();
    }, 1750);
  }
  function settle() {
    const r = R.current;
    let res = (r.correct > r.fCorrect || (r.correct === r.fCorrect && r.time <= r.fTime)) ? "win" : (r.correct === r.fCorrect ? "tie" : "lose");
    let dP = 0, dR = 0, ns = streak;
    if (res === "win") { dP = stake; dR = 24; ns = streak + 1; } else if (res === "lose") { dP = -stake; dR = -19; ns = 0; }
    setPoints((v) => v + dP); setRating((v) => Math.max(800, v + dR)); setStreak(ns);
    R.current.bestStreak = Math.max(R.current.bestStreak, ns);
    const gain = (res === "win" ? 60 : 25) + r.correct * 8;
    let nx = xp + gain, nl = level, up = false;
    while (nx >= nl * 120) { nx -= nl * 120; nl++; up = true; }
    setXp(nx); if (up) { setLevel(nl); setLevelUp(nl); }
    setMprog((m) => ({ play: m.play + 1, streak: Math.max(m.streak, ns), iq: r.maxIQ >= 130 ? 1 : m.iq }));

    // IRT 최종 추정: 능력치 θ, 표준오차 SE(θ), 95% 신뢰구간
    const finalTheta = estimateTheta(r.responses);
    const finalSE = fisherSE(r.responses, finalTheta);
    const finalIQ = Math.max(55, Math.min(170, Math.round(100 + 15 * finalTheta)));
    setIqHistory((h) => [...h.slice(-7), finalIQ]);
    setLastLog(r.log);
    setCatAgg((agg) => { const n = { ...agg }; r.log.forEach((l) => { n[l.tag] = n[l.tag] || { c: 0, t: 0 }; n[l.tag] = { c: n[l.tag].c + (l.correct ? 1 : 0), t: n[l.tag].t + 1 }; }); return n; });
    setOutcome({ res, mFinal: r.correct, fFinal: r.fCorrect, dP, dR, streakNow: ns, iq: finalIQ, theta: finalTheta, se: finalSE, ...pctlOf(finalIQ), xpGain: gain, react: +(r.time / r.answered).toFixed(1) });
    track("battle_complete", { result: res, iq: finalIQ });
    setScreen("result");
    if (!account) setGuestMatchDone(true);

    // 이번 판에 나온 문항들을 "최근 본 문항" 목록에 추가 (다음 판에서 반복 방지, 최근 200개만 유지)
    setRecentQuestionIds((prev) => [...prev, ...r.qs.map((x) => x.id)].slice(-200));

    // 공유 저장: 이 경기 기록을 match_logs에 반영 (비동기, 실패해도 게임에 영향 없음)
    // 랭킹은 profiles 테이블 위의 뷰라서 위쪽 saveProfile 저장만으로 자동 반영됩니다.
    const newRating = Math.max(800, rating + dR);
    if (account?.id) {
      saveMatchLog(account.id, {
        nick: account.nick, rating: newRating, result: res, iq: finalIQ, theta: finalTheta, se: finalSE,
        log: r.log.map((l) => ({ correct: l.correct, time: l.time })),
      });
    }
  }
  const buy = (item, price) => {
    if (!account?.id) { setScreen("needlogin"); return; }
    setModal({ item, price });
  };
  function buyPoints(pack) { setModal({ item: "points:" + pack.id, price: pack.price, points: pack.amount, name: `포인트 ${pack.amount.toLocaleString()}P` }); }
  const [buyBusy, setBuyBusy] = useState(false);
  const confirmBuy = async () => {
    track("purchase", { item: modal.item, price: modal.price });
    if (modal.points) {
      // 포인트 충전은 당분간 클라이언트에서 바로 처리 (이번 보안 조치 범위 밖 — 다음 단계에서 서버 권위로 전환 예정)
      setPoints((v) => v + modal.points);
      setModal(null);
      return;
    }
    // report/adfree/배틀패스/무제한 이용권처럼 "결제로 켜지는 권한"은
    // owned·unlimited_until에 저장되는데, 이 값들은 이제 서버(confirm-purchase
    // Edge Function)만 바꿀 수 있습니다. 실제 결제는 Google Play(네이티브)에서
    // 진행되고, 결제 영수증(purchaseToken)을 서버가 구글에 재검증한 뒤에만
    // 반영됩니다 — 클라이언트가 직접 owned를 켜는 경로는 없습니다.
    if (!account?.id) { setModal(null); setScreen("needlogin"); return; }
    if (!isNativeBilling()) {
      window.alert("실제 결제는 안드로이드 앱에서만 가능해요. (지금은 미리보기 환경입니다)");
      setModal(null);
      return;
    }
    setBuyBusy(true);
    try {
      const token = getAuthToken() || SUPABASE_ANON_KEY;
      const p = await purchaseViaPlayBilling(modal.item, token);
      setOwned(p.owned || {});
      setUnlimitedUntil(p.unlimited_until ? new Date(p.unlimited_until).getTime() : 0);
      if (p.hearts != null) setHearts(p.hearts);
    } catch (e) {
      window.alert(e?.message || "결제 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBuyBusy(false);
      setModal(null);
    }
  };
  const claim = (id, reward) => { setPoints((v) => v + reward); setMclaim((c) => ({ ...c, [id]: true })); };

  // 아바타 꾸미기: 포인트로만 구매·장착 (현금 결제 없음, 포인트 소비만)
  function equipCosmetic(kind, id) {
    if (kind === "skin") { setEquippedSkin(id); track("cosmetic_equip", { kind, id }); return; }
    const b = badgeOf(id);
    if (level < b.minLevel) return; // 레벨 미달 - 아직 해금 안 됨
    setEquippedBadge(id);
    track("cosmetic_equip", { kind, id });
  }
  // 포인트의 유일한 용도: 하트 구매 (현금 → 포인트 → 하트, 단방향)
  function buyHeartWithPoints() {
    if (points < HEART_PRICE_POINTS || hearts >= MAX_HEARTS) return;
    setPoints((v) => v - HEART_PRICE_POINTS);
    setHearts((v) => Math.min(MAX_HEARTS, v + 1));
    track("heart_bought_with_points", { price: HEART_PRICE_POINTS });
  }

  const showNav = ["home", "leaderboard", "missions", "store"].includes(screen);
  const myRank = Math.max(9, board.length + Math.round((1600 - Math.min(1600, rating)) * 0.9) + 40);

  // 리포트 파생 데이터
  const react = outcome?.react ?? 5.2;
  const cats = {};
  lastLog.forEach((l) => { cats[l.tag] = cats[l.tag] || { c: 0, t: 0 }; cats[l.tag].t++; if (l.correct) cats[l.tag].c++; });
  const lastIQ = iqHistory[iqHistory.length - 1];
  const totalAns = lastLog.length || Q_PER_MATCH;
  const correctAns = lastLog.filter((l) => l.correct).length || Math.round(totalAns * 0.6);
  const accPart = Math.round(((((correctAns + 1) / (totalAns + 2)) - 0.5) * 80)); // 정확도 기여분(참고용 직관적 분해)
  const spdPart = Math.round(Math.max(0, Math.min(12, (1 - react / Q_TIME) * 14))); // 속도 기여분(참고용 직관적 분해)
  const cum = Object.keys(catAgg).length ? catAgg : cats;
  const catList = Object.entries(cum).map(([tag, v]) => ({ tag, acc: v.c / v.t, c: v.c, t: v.t }));
  const catSorted = [...catList].sort((a, b) => b.acc - a.acc);
  const best = catSorted[0], worst = catSorted[catSorted.length - 1];
  const totAtt = Object.values(cum).reduce((s, v) => s + v.t, 0) || 1;
  // IRT 표준오차 기반 95% 신뢰구간 (직전 경기 기록이 있으면 실측값, 없으면 문항수 기반 근사)
  const seIQ = outcome?.se != null ? outcome.se * 15 : Math.min(18, 34 / Math.sqrt(Math.max(1, totAtt)));
  const ciMargin = Math.round(1.96 * seIQ) || 6;

  // 프리미엄 2단계: 1단계(₩500)는 방금 대결 결과만, 2단계(₩2,900)는 리포트 전체
  const reportTier1 = !!(owned.report1 || owned.report2); // 결과 확인권 (또는 상위 등급 보유)
  const reportTier2 = !!owned.report2; // 전체 리포트

  const displayNick = account?.nick || "게스트";

  if (!booted) return <div style={{ minHeight: "100vh", background: C.bg0 }} />;

  return (
    <div style={{ minHeight: "100vh", fontFamily: FONT, color: C.text, position: "relative", background: `radial-gradient(1000px 520px at 15% -5%, ${C.bg2}, transparent), radial-gradient(900px 500px at 90% 8%, #1a2f5a55, transparent), linear-gradient(${C.bg1}, ${C.bg0})`, display: "flex", justifyContent: "center", padding: "20px 14px 96px" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
        *{box-sizing:border-box} ::selection{background:${C.violetDeep}66}
        @keyframes pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes rise{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bump{0%{transform:scale(1)}40%{transform:scale(1.2)}100%{transform:scale(1)}}
        @keyframes floatUp{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
        @keyframes shine{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>

      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg,${C.indigo},${C.me})`, display: "grid", placeItems: "center", boxShadow: C.glow }}><Ico name="bolt" c="#08121a" s={18} /></div>
            <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: -0.5 }}>IQ BATTLE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => { if (!unlimited && hearts < MAX_HEARTS) toPaywall(false); }} style={{ display: "flex", alignItems: "center", gap: 6, background: C.card, border: `1px solid ${C.line}`, padding: "9px 12px", borderRadius: 13, fontWeight: 800, boxShadow: C.shadow, cursor: "pointer", fontFamily: FONT, color: C.text }}>
              {unlimited ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.gold }}><Ico name="bolt" c={C.gold} s={15} /><span style={{ fontSize: 13 }}>무제한</span></span>
                : <><span style={{ display: "flex", gap: 2 }}>{[0, 1, 2].map((i) => <Heart key={i} s={16} on={i < hearts} />)}</span>{hearts < MAX_HEARTS && <span style={{ fontSize: 11, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{fmt(regen)}</span>}</>}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.card, border: `1px solid ${C.line}`, color: C.gold, padding: "9px 12px", borderRadius: 13, fontWeight: 800, boxShadow: C.shadow }}><Coin /> {points.toLocaleString()}</div>
          </div>
        </div>

        {/* ── 홈 ── */}
        {screen === "home" && (
          <div style={{ animation: "rise .4s ease" }}>
            <Card style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar color={skinGrad(equippedSkin)} label={displayNick[0]} s={54} badgeEmoji={badgeOf(equippedBadge).emoji} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 16, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayNick}</span>
                  {account ? (
                    <>
                      <button onClick={logout} style={{ background: "none", border: `1px solid ${C.line}`, color: C.muted, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, cursor: "pointer", fontFamily: FONT }}>로그아웃</button>
                      <button onClick={() => { if (window.confirm("진행 기록을 초기화할까요? 되돌릴 수 없어요.")) resetAll(); }} style={{ background: "none", border: `1px solid ${C.line}`, color: C.muted, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, cursor: "pointer", fontFamily: FONT }}>초기화</button>
                    </>
                  ) : (
                    <button onClick={handleKakaoLogin} disabled={loggingIn} style={{ background: "#FEE500", border: "none", color: "#191600", fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 8, cursor: loggingIn ? "not-allowed" : "pointer", fontFamily: FONT }}>{loggingIn ? "로그인 중…" : "카카오 로그인"}</button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}><span style={{ fontWeight: 800, fontSize: 13, color: C.sub }}>Lv.{level}</span><span style={{ color: tier.color, fontWeight: 800, fontSize: 13 }}>{tier.name} · {rating}</span><button onClick={() => setShowInfo(true)} title="등급·레벨 설명" style={{ display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, color: C.muted }}><Ico name="info" c={C.muted} s={16} /></button></div>
                <div style={{ height: 7, background: "rgba(0,0,0,0.3)", borderRadius: 99, marginTop: 7, overflow: "hidden" }}><div style={{ width: `${Math.min(100, (xp / (level * 120)) * 100)}%`, height: "100%", background: `linear-gradient(90deg,${C.violetDeep},${C.me})` }} /></div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
                  Lv는 대결할수록 오르는 <b style={{ color: C.sub }}>활동 지표</b>, {tier.name} {rating}점은 승패로 오르내리는 <b style={{ color: C.sub }}>실력 점수</b>예요
                  {nextTierGap != null && <> · 다음 등급까지 <b style={{ color: tier.color }}>{nextTierGap}점</b></>}
                </div>
              </div>
              <div style={{ textAlign: "center" }}><div style={{ color: C.muted, fontSize: 11 }}>연승</div><div style={{ color: C.mint, fontWeight: 900, fontSize: 22 }}>{streak}</div></div>
            </Card>

            <Card glow style={{ padding: "28px 22px", textAlign: "center", marginTop: 14 }}>
              <div style={{ fontSize: 29, fontWeight: 900, lineHeight: 1.25, letterSpacing: -0.5 }}>실시간 대결로<br /><span style={{ background: `linear-gradient(135deg,${C.me},${C.violet})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IQ와 랭킹</span>을 올리세요</div>
              <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, margin: "10px 0 18px" }}>문제를 풀 때마다 난이도가 실력에 맞춰 조정되고,<br />IQ 지수와 전국 순위가 실시간으로 갱신됩니다.</p>
              <Btn kind="battle" onClick={goStake} style={{ width: "100%" }}>대결 상대 찾기 →</Btn>
              <div style={{ marginTop: 12, fontSize: 12.5, color: C.muted }}>
                {unlimited ? <span style={{ color: C.gold, fontWeight: 700 }}>무제한 이용권 사용 중</span>
                  : <>무료 대결 <b style={{ color: C.foe }}>{hearts}</b> / {MAX_HEARTS}회 남음{hearts < MAX_HEARTS && ` · 다음 회복 ${fmt(regen)}`}</>}
              </div>
            </Card>

            <Card style={{ padding: 16, marginTop: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div onClick={() => setScreen("report")} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.gold},${C.goldDeep})`, display: "grid", placeItems: "center" }}><Ico name="target" c="#4a2d00" s={20} /></div>
                <div><div style={{ fontWeight: 800 }}>내 분석 리포트</div><div style={{ color: C.muted, fontSize: 12 }}>IRT 능력추정 · 유형별 강약점 · 반응속도</div></div>
              </div>
              <span onClick={() => setScreen("report")} style={{ color: C.violet, fontWeight: 800, fontSize: 20 }}>›</span>
            </Card>

            <Card style={{ padding: 16, marginTop: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div onClick={() => setScreen("customize")} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <Avatar color={skinGrad(equippedSkin)} label={displayNick[0]} s={42} badgeEmoji={badgeOf(equippedBadge).emoji} />
                <div><div style={{ fontWeight: 800 }}>아바타 꾸미기</div><div style={{ color: C.muted, fontSize: 12 }}>포인트로 스킨·심볼 구매</div></div>
              </div>
              <span onClick={() => setScreen("customize")} style={{ color: C.violet, fontWeight: 800, fontSize: 20 }}>›</span>
            </Card>

            <p style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.6, marginTop: 16, textAlign: "center" }}>※ 포인트는 게임 내 재화이며 <b>현금으로 환전되지 않습니다.</b></p>
          </div>
        )}

        {/* ── 베팅 ── */}
        {screen === "stake" && (
          <div style={{ animation: "rise .4s ease" }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>베팅 포인트 선택</div>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 18 }}>이기면 상대 포인트를 가져오고, 지면 잃습니다.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {STAKES.map((s) => { const ok = points >= s; return (
                <button key={s} disabled={!ok} onClick={() => startMatch(s)} style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 18, padding: "22px 14px", cursor: ok ? "pointer" : "not-allowed", opacity: ok ? 1 : 0.4, fontFamily: FONT, color: C.text, boxShadow: C.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 24, fontWeight: 900, color: C.gold }}><Coin s={22} />{s.toLocaleString()}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>승리 시 +{s.toLocaleString()}</div>
                </button>); })}
            </div>
            <Btn kind="ghost" onClick={() => setScreen("home")} style={{ width: "100%", marginTop: 18 }}>← 뒤로</Btn>
          </div>
        )}

        {/* ── 하트 소진 (페이월) ── */}
        {screen === "outofhearts" && (
          <div style={{ animation: "rise .4s ease" }}>
            <Card glow style={{ padding: "28px 22px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>{[0, 1, 2].map((i) => <Heart key={i} s={30} on={i < hearts} />)}</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>무료 대결을 모두 사용했어요</div>
              <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, margin: "10px 0 4px" }}>
                {hearts > 0 ? "아직 남은 하트가 있어요!" : <>다음 무료 하트까지 <b style={{ color: C.gold }}>{fmt(regen)}</b></>}
              </p>
              <p style={{ color: C.muted, fontSize: 12.5, marginBottom: 20 }}>기다리거나, 광고를 보거나, 포인트나 무제한 이용권으로 바로 계속하세요.</p>

              {hearts > 0
                ? <Btn kind="battle" onClick={() => setScreen("stake")} style={{ width: "100%" }}>바로 대결하기 (하트 {hearts})</Btn>
                : <Btn kind="ghost" onClick={watchAd} disabled={adState === "playing"} style={{ width: "100%" }}>{adState === "playing" ? "광고 시청 중…" : "🎬 광고 보고 하트 1개 받기"}</Btn>}
              {hearts < MAX_HEARTS && (
                <Btn kind="primary" onClick={buyHeartWithPoints} disabled={points < HEART_PRICE_POINTS} style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Coin s={16} /> {HEART_PRICE_POINTS}P로 하트 1개 (보유 {points.toLocaleString()}P)
                </Btn>
              )}
            </Card>

            <div style={{ fontWeight: 800, fontSize: 15, margin: "22px 4px 12px" }}>무제한 이용권</div>
            {PASSES.map((p) => (
              <Card key={p.id} style={{ padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.indigo},${C.me})`, display: "grid", placeItems: "center" }}><Ico name="bolt" c="#08121a" s={18} /></div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{p.name}</div><div style={{ color: C.muted, fontSize: 12 }}>기간 내 하트 소모 없이 무제한</div></div>
                <Btn onClick={() => buyPass(p)} style={{ padding: "10px 14px", fontSize: 14 }}>₩{p.price.toLocaleString()}</Btn>
              </Card>
            ))}
            <Btn kind="ghost" onClick={() => setScreen("home")} style={{ width: "100%", marginTop: 8 }}>← 홈으로</Btn>
            <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.6, marginTop: 12, textAlign: "center" }}>※ 가격·회복 시간은 예시입니다. 결제는 데모이며 실제 청구되지 않습니다.</p>
          </div>
        )}

        {/* ── 게스트 1판 체험 후 카카오 로그인 유도 ── */}
        {screen === "needlogin" && (
          <div style={{ animation: "rise .4s ease" }}>
            <Card glow style={{ padding: "28px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>한 판 플레이해보셨네요!</div>
              <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, margin: "10px 0 20px" }}>
                계속 대결하고 레이팅·리포트·랭킹을<br />저장하려면 카카오 로그인이 필요해요.
              </p>
              <button onClick={handleKakaoLogin} disabled={loggingIn} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FEE500", color: "#191600", border: "none", borderRadius: 12, padding: "15px 20px", fontFamily: FONT, fontSize: 16, fontWeight: 800, cursor: loggingIn ? "not-allowed" : "pointer", opacity: loggingIn ? 0.6 : 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#191600" d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.19 4.6 6.58l-.94 3.44a.5.5 0 00.76.55l4.1-2.72c.48.05.96.08 1.48.08 5.52 0 10-3.48 10-7.93S17.52 3 12 3z" /></svg>
                {loggingIn ? "로그인 중…" : "카카오로 계속하기"}
              </button>
              {loginError && <div style={{ color: C.foe, fontSize: 12.5, marginTop: 12, lineHeight: 1.6 }}>{loginError}</div>}
            </Card>
            <Btn kind="ghost" onClick={() => setScreen("home")} style={{ width: "100%", marginTop: 12 }}>나중에 할게요</Btn>
            <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.6, marginTop: 12, textAlign: "center" }}>홈·랭킹·스토어 구경은 로그인 없이도 계속 가능해요.</p>
          </div>
        )}

        {/* ── 매칭 ── */}
        {screen === "matching" && foe && (
          <div style={{ animation: "pop .3s ease", textAlign: "center", paddingTop: 30 }}>
            <div style={{ width: 46, height: 46, border: `4px solid ${C.line}`, borderTopColor: C.me, borderRadius: "50%", margin: "0 auto 22px", animation: "spin .8s linear infinite" }} />
            <div style={{ fontWeight: 900, fontSize: 20, animation: "pulse 1.2s ease infinite" }}>비슷한 실력의 상대 찾는 중…</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 30 }}>
              <div><Avatar color={skinGrad(equippedSkin)} label="나" s={60} badgeEmoji={badgeOf(equippedBadge).emoji} /><div style={{ marginTop: 8, fontWeight: 800 }}>{rating}</div></div>
              <div style={{ fontWeight: 900, fontSize: 26, color: C.gold }}>VS</div>
              <div><Avatar color={C.foe} label="?" s={60} /><div style={{ marginTop: 8, fontWeight: 800, color: C.muted }}>매칭중</div></div>
            </div>
          </div>
        )}

        {/* ── 배틀 ── */}
        {screen === "battle" && qs.length > 0 && (() => {
          const q = qs[bqi]; const low = tleft <= 5;
          return (
            <div style={{ animation: "rise .25s ease" }}>
              {foe?.ghost && (
                <div style={{ textAlign: "center", fontSize: 11.5, color: C.violet, fontWeight: 700, marginBottom: 8 }}>
                  🎥 실제 유저 <b style={{ color: C.text }}>{foe.name}</b>님의 플레이 기록 기반 고스트 대결
                </div>
              )}
              <Card style={{ padding: "14px 16px", marginBottom: 12, position: "relative", overflow: "hidden", background: `linear-gradient(135deg,${C.indigo}22,${C.me}18)` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div><div style={{ fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 1 }}>실시간 IQ (IRT 추정)</div>
                    <div key={liveIQ} style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: C.me, animation: "bump .4s ease" }}>{liveIQ}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, color: C.gold, fontWeight: 800 }}>상위 {live.top}%</div>
                    <div key={live.rank} style={{ fontSize: 13, color: C.text, fontWeight: 700, animation: "pop .3s ease" }}>전체 {live.rank.toLocaleString()}위</div></div>
                </div>
                {flash && <div key={flash.key} style={{ position: "absolute", right: 16, top: 8, color: C.gold, fontWeight: 900, fontSize: 15, animation: "floatUp 1.2s ease forwards" }}>{flash.combo}연속 🔥 +{flash.bonus}</div>}
              </Card>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Score color={C.me} label="나" score={myScore} align="left" badgeEmoji={badgeOf(equippedBadge).emoji} />
                <div style={{ textAlign: "center", minWidth: 50 }}><div style={{ fontSize: 11, color: C.muted }}>{bqi + 1}/{Q_PER_MATCH}</div><div style={{ fontWeight: 900, fontSize: 22, color: low ? C.foe : C.gold }}>{tleft}</div></div>
                <Score color={C.foe} label={foe.name} score={foeScore} align="right" />
              </div>

              <Card style={{ padding: "26px 20px", marginBottom: 14, textAlign: "center" }}>
                <div style={{ color: C.violet, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{q.tag}{combo >= 2 && <span style={{ color: C.gold }}> · {combo}콤보</span>}</div>
                <div style={{ color: C.gold, fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }} title="적응형 난이도 — 내 실력 추정치에 맞춰 자동 조정됩니다">{diffLabel(q.b)}</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.4 }}>{q.q}</div>
              </Card>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {q.options.map((opt, i) => {
                  const done = picked !== null; const isAns = i === q.answer;
                  let bg = C.card, border = C.line;
                  if (done) { if (isAns) { bg = "rgba(57,217,138,0.18)"; border = C.mint; } else if (i === picked) { bg = "rgba(251,92,125,0.18)"; border = C.foe; } }
                  return (
                    <button key={i} onClick={() => answer(i, bqi)} disabled={done} style={{ position: "relative", background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: "20px 14px", fontFamily: FONT, fontSize: 19, fontWeight: 800, color: C.text, cursor: done ? "default" : "pointer", minHeight: 60, transition: "all .15s ease", boxShadow: done ? "none" : C.shadow }}>
                      {opt}{done && i === picked && <Tag color={C.me} txt="나" side="left" />}{done && foePicked === i && <Tag color={C.foe} txt="상대" side="right" />}
                    </button>);
                })}
              </div>
            </div>
          );
        })()}

        {/* ── 결과 ── */}
        {screen === "result" && outcome && (
          <div style={{ animation: "pop .4s ease", textAlign: "center" }}>
            <Card style={{ padding: "26px 24px" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: outcome.res === "win" ? C.mint : outcome.res === "tie" ? C.gold : C.foe }}>{outcome.res === "win" ? "승리 🏆" : outcome.res === "tie" ? "무승부" : "패배"}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "12px 0" }}><span style={{ fontSize: 36, fontWeight: 900, color: C.me }}>{outcome.mFinal}</span><span style={{ color: C.muted }}>:</span><span style={{ fontSize: 36, fontWeight: 900, color: C.foe }}>{outcome.fFinal}</span></div>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ background: "rgba(0,0,0,0.28)", borderRadius: 14, padding: "16px 14px", display: "flex", filter: reportTier1 ? "none" : "blur(8px)", userSelect: "none" }}>
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>최종 IQ</div><div style={{ fontSize: 30, fontWeight: 900, color: C.me }}>{outcome.iq}</div></div>
                  <div style={{ width: 1, background: C.line }} />
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>상위</div><div style={{ fontSize: 30, fontWeight: 900, color: C.gold }}>{outcome.top}%</div></div>
                  <div style={{ width: 1, background: C.line }} />
                  <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>전국</div><div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginTop: 6 }}>{outcome.rank.toLocaleString()}위</div></div>
                </div>
                {!reportTier1 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.text, fontWeight: 800, fontSize: 14 }}><Ico name="lock" c={C.gold} s={18} /> 내 IQ · 순위 잠금</div>
                    <Btn onClick={() => buy("report1", 500)} style={{ padding: "9px 16px", fontSize: 13 }}>결제하고 확인 · ₩500</Btn>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Pill c={outcome.dP >= 0 ? C.gold : C.foe}><Coin s={15} />{outcome.dP >= 0 ? "+" : ""}{outcome.dP.toLocaleString()}</Pill>
                <Pill c={C.violet}>레이팅 {outcome.dR >= 0 ? "+" : ""}{outcome.dR}</Pill><Pill c={C.me}>XP +{outcome.xpGain}</Pill>
                {outcome.streakNow > 1 && <Pill c={C.mint}>{outcome.streakNow}연승 🔥</Pill>}
              </div>
            </Card>
            <Btn kind="battle" onClick={() => setScreen("report")} style={{ width: "100%", marginTop: 14 }}>상세 분석 리포트 보기 →</Btn>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}><Btn kind="ghost" onClick={() => setScreen("home")} style={{ flex: 1 }}>홈</Btn><Btn kind="primary" onClick={goStake} style={{ flex: 1 }}>재대결</Btn></div>
          </div>
        )}

        {/* ── 리포트 (미리보기 → 결제 언락) ── */}
        {screen === "report" && (
          <div style={{ animation: "rise .4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: C.violet, fontSize: 22, cursor: "pointer" }}>‹</button>
              <div style={{ fontWeight: 900, fontSize: 20 }}>분석 리포트</div>
              {reportTier2 && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: C.gold, background: "rgba(255,206,77,0.12)", padding: "4px 10px", borderRadius: 8 }}>PREMIUM</span>}
              {reportTier1 && !reportTier2 && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: C.me, background: "rgba(62,224,207,0.12)", padding: "4px 10px", borderRadius: 8 }}>BASIC</span>}
            </div>

            {/* 상단 요약 — 무료엔 음영, 결제 시 공개 */}
            <Card style={{ padding: 20, marginBottom: 14, position: "relative" }}>
              <div style={{ display: "flex", gap: 14, filter: reportTier1 ? "none" : "blur(8px)", userSelect: "none" }}>
                <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>최근 IQ</div><div style={{ fontSize: 30, fontWeight: 900, color: C.me }}>{iqHistory[iqHistory.length - 1]}</div></div>
                <div style={{ width: 1, background: C.line }} />
                <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>상위</div><div style={{ fontSize: 30, fontWeight: 900, color: C.gold }}>{pctlOf(iqHistory[iqHistory.length - 1]).top}%</div></div>
                <div style={{ width: 1, background: C.line }} />
                <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: C.muted }}>전국</div><div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginTop: 5 }}>{pctlOf(iqHistory[iqHistory.length - 1]).rank.toLocaleString()}위</div></div>
              </div>
              {!reportTier1 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.sub, fontWeight: 800, fontSize: 13 }}><Ico name="lock" c={C.gold} s={16} /> 결제 시 공개</span>
                  <Btn onClick={() => buy("report1", 500)} style={{ padding: "8px 14px", fontSize: 12.5 }}>방금 결과 보기 · ₩500</Btn>
                </div>
              )}
            </Card>

            {/* 프리미엄 상세 — 잠금/해제 */}
            <div style={{ position: "relative" }}>
              <div style={{ filter: reportTier2 ? "none" : "blur(6px)", pointerEvents: reportTier2 ? "auto" : "none", userSelect: "none" }}>
                <Card style={{ padding: 20, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>IQ 추이</div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>최근 {iqHistory.length}경기 · 꾸준히 상승 중</div>
                  <IQChart data={iqHistory} />
                </Card>
                <Card style={{ padding: 20, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>IQ 점수 구성 분해</div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>기본 100점 위에 정확도·속도가 얼마나 기여했는지 (직관적 참고용 분해)</div>
                  <div style={{ display: "flex", height: 26, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ width: `${(100 / lastIQ) * 100}%`, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: C.sub }}>기본 100</div>
                    <div style={{ width: `${(Math.max(0, accPart) / lastIQ) * 100}%`, background: C.me, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: "#08121a" }}>{accPart >= 0 ? `+${accPart}` : accPart}</div>
                    <div style={{ width: `${(spdPart / lastIQ) * 100}%`, background: C.gold, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: "#4a2d00" }}>+{spdPart}</div>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.sub }}>
                    <span><span style={{ color: C.me }}>■</span> 정확도 {correctAns}/{totalAns}</span>
                    <span><span style={{ color: C.gold }}>■</span> 속도 {react}초</span>
                  </div>
                </Card>
                <Card style={{ padding: 20, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>강점 · 약점 인사이트</div>
                  {best && worst ? (
                    <>
                      <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.7, marginBottom: 12 }}>
                        가장 강한 유형은 <b style={{ color: C.mint }}>{best.tag}</b>(정답률 {Math.round(best.acc * 100)}%), 가장 약한 유형은 <b style={{ color: C.foe }}>{worst.tag}</b>(정답률 {Math.round(worst.acc * 100)}%)입니다.
                        {worst.acc < 0.6 && <> <b style={{ color: C.foe }}>{worst.tag}</b> 유형을 집중 연습하면 IQ 점수를 가장 빠르게 끌어올릴 수 있어요.</>}
                      </div>
                      {catSorted.map((c) => <Bar key={c.tag} label={c.tag} pct={c.acc * 100} val={`${c.c}/${c.t}`} color={c.acc >= 0.6 ? C.mint : c.acc >= 0.4 ? C.gold : C.foe} />)}
                    </>
                  ) : <div style={{ color: C.muted, fontSize: 13 }}>대결을 완료하면 누적 강·약점이 표시됩니다.</div>}
                </Card>
                <Card style={{ padding: 20, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>반응속도 분석</div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>문항당 평균 응답 시간 비교</div>
                  <Bar label="내 평균" pct={Math.min(100, (1 - react / Q_TIME) * 100 + 8)} val={`${react}초`} color={C.me} />
                  <Bar label="상위권 평균" pct={(1 - PRO_REACTION / Q_TIME) * 100 + 8} val={`${PRO_REACTION}초`} color={C.gold} />
                  <Bar label="전체 평균" pct={(1 - AVG_REACTION / Q_TIME) * 100 + 8} val={`${AVG_REACTION}초`} color={C.muted} />
                </Card>
                <Card style={{ padding: 20, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>IRT 능력치(θ) 추정 · 신뢰구간</div>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
                    2모수 로지스틱(2PL) 문항반응이론으로 추정 · 문항마다 난이도가 실력에 맞춰 자동 조정(적응형 검사)됩니다
                  </div>
                  <div style={{ textAlign: "center", background: "rgba(0,0,0,0.28)", borderRadius: 12, padding: "14px 12px", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: C.sub }}>추정 IQ 95% 신뢰구간</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: C.me, marginTop: 4 }}>{lastIQ - ciMargin} ~ {lastIQ + ciMargin}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>점 추정치 {lastIQ} · 오차 ±{ciMargin} (SE·Fisher 정보량 기반)</div>
                  </div>
                  {outcome?.theta != null && (
                    <div style={{ display: "flex", gap: 10, fontSize: 12.5, color: C.sub, justifyContent: "center" }}>
                      <span>θ = <b style={{ color: C.text }}>{outcome.theta.toFixed(2)}</b></span>
                      <span>SE(θ) = <b style={{ color: C.text }}>{outcome.se.toFixed(2)}</b></span>
                    </div>
                  )}
                </Card>

              </div>

              {!reportTier2 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <Card glow style={{ padding: "26px 22px", textAlign: "center", maxWidth: 340, width: "100%" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 15, margin: "0 auto 14px", background: `linear-gradient(135deg,${C.gold},${C.goldDeep})`, display: "grid", placeItems: "center" }}><Ico name="lock" c="#4a2d00" s={24} /></div>
                    <div style={{ fontWeight: 900, fontSize: 19 }}>{reportTier1 ? "전체 리포트로 업그레이드" : "프리미엄 리포트"}</div>
                    <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.7, margin: "10px 0 16px", textAlign: "left" }}>
                      {reportTier1 ? "방금 결과는 이미 확인했어요. 결제하면 이런 내용까지 볼 수 있어요:" : "결제하면 이런 내용을 볼 수 있어요:"}<br />
                      <span style={{ color: C.me }}>✓</span> 경기별 <b>IQ 추이 그래프</b><br />
                      <span style={{ color: C.me }}>✓</span> <b>IQ 점수 구성 분해</b> (정확도·속도)<br />
                      <span style={{ color: C.me }}>✓</span> 누적 유형별 <b>강점·약점 인사이트</b><br />
                      <span style={{ color: C.me }}>✓</span> <b>반응속도</b> 상위권/전체 비교<br />
                      <span style={{ color: C.me }}>✓</span> IRT 기반 <b>능력치·신뢰구간</b>
                    </div>
                    <Btn onClick={() => buy("report2", 2900)} style={{ width: "100%" }}>₩2,900 · 평생 이용</Btn>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 10 }}>1회 결제 · 이후 모든 리포트 무제한 열람</div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 랭킹 ── */}
        {screen === "leaderboard" && (
          <div style={{ animation: "rise .4s ease" }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>전국 랭킹</div>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 16 }}>이번 시즌 · 총 {TOTAL_PLAYERS.toLocaleString()}명 참가</div>
            {board.map((p, i) => <Row key={p.name} rank={i + 1} name={p.name} right={`${p.rating} · IQ ${p.iq}`} medal={i} />)}
            <div style={{ height: 1, background: C.line, margin: "12px 0" }} />
            <Row rank={myRank} name={displayNick} right={`${rating} · ${tier.name}`} medal={99} me />

            {liveBoard.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 22, marginBottom: 10 }}>
                  <Ico name="sparkle" c={C.me} s={14} />
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>실제 참가자 랭킹</div>
                  <span style={{ fontSize: 11, color: C.muted }}>(이 앱을 플레이한 실제 유저 데이터)</span>
                </div>
                {liveBoard.slice(0, 15).map((p, i) => (
                  <Row key={p.nick + p.ts} rank={i + 1} name={p.nick} right={`${p.rating} · IQ ${p.iq}`} medal={i} me={!!account && p.nick === account.nick} />
                ))}
              </>
            )}
            <p style={{ color: C.muted, fontSize: 12, marginTop: 14, textAlign: "center" }}>대결에서 이겨 레이팅을 올리면 순위가 상승합니다.</p>
          </div>
        )}

        {/* ── 미션 ── */}
        {screen === "missions" && (
          <div style={{ animation: "rise .4s ease" }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>일일 미션</div>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 16 }}>매일 자정 초기화 · 보상은 포인트로 지급</div>
            {MISSIONS.map((m) => { const prog = Math.min(mprog[m.id], m.goal); const done = prog >= m.goal; const claimed = mclaim[m.id]; return (
              <Card key={m.id} style={{ padding: "16px 18px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontWeight: 800 }}>{m.label}</span><span style={{ display: "flex", alignItems: "center", gap: 4, color: C.gold, fontWeight: 800, fontSize: 14 }}><Coin s={15} />{m.reward}</span></div>
                <div style={{ height: 8, background: "rgba(0,0,0,0.3)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}><div style={{ width: `${(prog / m.goal) * 100}%`, height: "100%", background: `linear-gradient(90deg,${C.violetDeep},${C.me})` }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: C.muted, fontSize: 12 }}>{prog} / {m.goal}</span>{claimed ? <span style={{ color: C.mint, fontWeight: 800, fontSize: 13 }}>수령 완료</span> : <Btn disabled={!done} onClick={() => claim(m.id, m.reward)} style={{ padding: "8px 16px", fontSize: 13 }}>{done ? "받기" : "진행중"}</Btn>}</div>
              </Card>); })}
          </div>
        )}

        {/* ── 스토어 ── */}
        {screen === "store" && (
          <div style={{ animation: "rise .4s ease" }}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>스토어</div>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 16 }}>운영 수익원 · 실제 결제로 구매합니다</div>
            {[
              { id: "report1", name: "방금 결과 확인권", desc: "직전 대결의 최종 IQ · 상위% · 전국 순위만", price: 500 },
              { id: "report2", name: "프리미엄 리포트 (평생)", desc: "IQ 추이·IRT 능력추정·강약점 전체", price: 2900 },
              { id: "adfree", name: "광고 제거 (월)", desc: "대결 사이 광고 없이 몰입", price: 3900 },
              { id: "pass", name: "시즌 배틀패스", desc: "보상 트랙 + 스킨 + 데일리 포인트", price: 9900 },
            ].map((it, i) => (
              <Card key={it.id} style={{ padding: 18, marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${[C.me, C.violetDeep, C.indigo, C.gold][i]}, ${[C.violet, C.indigo, C.violet, C.goldDeep][i]})`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{it.name}</div><div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{it.desc}</div></div>
                {owned[it.id] || (it.id === "report1" && owned.report2) ? <span style={{ color: C.mint, fontWeight: 800, fontSize: 14 }}>보유중</span> : <Btn onClick={() => buy(it.id, it.price)} style={{ padding: "10px 14px", fontSize: 14 }}>₩{it.price.toLocaleString()}</Btn>}
              </Card>
            ))}
            <p style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>※ 가격은 예시입니다. 실제 결제는 인앱결제/PG(토스페이먼츠·포트원 등) 연동이 필요하며, 사업자 정산 계좌로 입금됩니다.</p>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 26, marginBottom: 10 }}>
              <Coin s={16} /><div style={{ fontWeight: 800, fontSize: 15 }}>포인트 충전</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {POINT_PACKS.map((pk) => (
                <button key={pk.id} onClick={() => buyPoints(pk)} style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "16px 12px", cursor: "pointer", fontFamily: FONT, color: C.text, boxShadow: C.shadow, textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 18, fontWeight: 900, color: C.gold }}><Coin s={16} />{pk.amount.toLocaleString()}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>₩{pk.price.toLocaleString()}</div>
                </button>
              ))}
            </div>
            <p style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.6, marginTop: 10 }}>
              ※ 충전한 포인트는 대결 베팅과 <b>하트 구매({HEART_PRICE_POINTS}P)</b>에 쓰는 게임 내 재화입니다. <b style={{ color: C.foe }}>포인트 → 현금 환전은 불가능합니다</b> (현금 → 포인트로만 전환되는 단방향 충전). 아바타 스킨은 무료, 심볼은 레벨업으로 해금돼요.
            </p>
          </div>
        )}

        {/* ── 아바타 꾸미기 (스킨=무료 선택 · 심볼=레벨업으로 자동 해금) ── */}
        {screen === "customize" && (
          <div style={{ animation: "rise .4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: C.violet, fontSize: 22, cursor: "pointer" }}>‹</button>
              <div style={{ fontWeight: 900, fontSize: 20 }}>아바타 꾸미기</div>
            </div>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 16 }}>스킨은 자유롭게 골라 쓰고, 심볼은 레벨을 올리면 자동으로 해금돼요</div>

            <Card style={{ padding: 20, marginBottom: 16, textAlign: "center" }}>
              <Avatar color={skinGrad(equippedSkin)} label={displayNick[0]} s={72} badgeEmoji={badgeOf(equippedBadge).emoji} />
              <div style={{ marginTop: 10, fontWeight: 800 }}>{displayNick}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{skinOf(equippedSkin).name} · {badgeOf(equippedBadge).name} · Lv.{level}</div>
            </Card>

            <div style={{ fontWeight: 800, fontSize: 15, margin: "4px 4px 10px" }}>스킨 <span style={{ color: C.muted, fontWeight: 700, fontSize: 12 }}>· 전부 무료</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
              {AVATAR_SKINS.map((s) => {
                const eq = equippedSkin === s.id;
                return (
                  <button key={s.id} onClick={() => equipCosmetic("skin", s.id)}
                    style={{ background: C.card, border: `1.5px solid ${eq ? C.me : C.line}`, borderRadius: 16, padding: "14px 8px", cursor: "pointer", fontFamily: FONT, color: C.text, textAlign: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, margin: "0 auto 8px", background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})`, boxShadow: "inset 0 1px 2px rgba(255,255,255,0.35)" }} />
                    <div style={{ fontSize: 12.5, fontWeight: 800 }}>{s.name}</div>
                    <div style={{ fontSize: 11, marginTop: 3, color: eq ? C.me : C.muted, fontWeight: 700 }}>{eq ? "장착중" : "선택"}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ fontWeight: 800, fontSize: 15, margin: "4px 4px 10px" }}>심볼 <span style={{ color: C.muted, fontWeight: 700, fontSize: 12 }}>· 레벨업 시 자동 해금</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {BADGES.map((b) => {
                const unlocked = level >= b.minLevel;
                const eq = equippedBadge === b.id;
                return (
                  <button key={b.id} onClick={() => unlocked && equipCosmetic("badge", b.id)}
                    disabled={!unlocked}
                    style={{ background: C.card, border: `1.5px solid ${eq ? C.me : C.line}`, borderRadius: 16, padding: "14px 8px", cursor: unlocked ? "pointer" : "not-allowed", fontFamily: FONT, color: C.text, textAlign: "center", opacity: unlocked ? 1 : 0.45 }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{unlocked ? (b.emoji || "—") : "🔒"}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800 }}>{b.name}</div>
                    <div style={{ fontSize: 11, marginTop: 3, color: eq ? C.me : C.muted, fontWeight: 700 }}>
                      {eq ? "장착중" : unlocked ? "장착하기" : `Lv.${b.minLevel} 필요`}
                    </div>
                  </button>
                );
              })}
            </div>
            <p style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.6, marginTop: 18, textAlign: "center" }}>심볼은 돈이나 포인트로 살 수 없어요 — 대결을 계속해서 레벨을 올리면 자동으로 풀립니다.</p>
          </div>
        )}
      </div>

      {/* 하단 탭 */}
      {showNav && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(11,8,24,0.9)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 460, display: "flex" }}>
            {[["home", "홈", "home"], ["leaderboard", "랭킹", "trophy"], ["missions", "미션", "target"], ["store", "스토어", "bag"]].map(([k, label, ic]) => (
              <button key={k} onClick={() => setScreen(k)} style={{ flex: 1, background: "none", border: "none", padding: "11px 0 15px", cursor: "pointer", color: screen === k ? C.me : C.muted, fontFamily: FONT }}>
                <Ico name={ic} c={screen === k ? C.me : C.muted} s={22} />
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 결제 모달 */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(6,4,16,0.75)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()}>
            <Card glow style={{ padding: "26px 24px", width: "100%", maxWidth: 340, animation: "pop .25s ease" }}>
              <div style={{ fontWeight: 900, fontSize: 19, marginBottom: 6 }}>결제 확인</div>
              <div style={{ color: C.sub, fontSize: 14, marginBottom: 18 }}>결제 금액 <b style={{ color: C.text }}>₩{modal.price.toLocaleString()}</b><br /><span style={{ fontSize: 12, color: C.muted }}>(데모 — 실제 청구되지 않습니다)</span></div>
              <div style={{ display: "flex", gap: 10 }}><Btn kind="ghost" onClick={() => setModal(null)} disabled={buyBusy} style={{ flex: 1 }}>취소</Btn><Btn onClick={confirmBuy} disabled={buyBusy} style={{ flex: 1 }}>{buyBusy ? "처리 중…" : "결제하기"}</Btn></div>
            </Card>
          </div>
        </div>
      )}

      {/* 레벨업 */}
      {levelUp && (
        <div onClick={() => setLevelUp(null)} style={{ position: "fixed", inset: 0, background: "rgba(6,4,16,0.82)", display: "grid", placeItems: "center", padding: 20, zIndex: 60 }}>
          <div style={{ textAlign: "center", animation: "pop .35s ease" }}>
            <div style={{ fontSize: 15, color: C.gold, fontWeight: 800, letterSpacing: 2 }}>LEVEL UP</div>
            <div style={{ fontSize: 68, fontWeight: 900, background: `linear-gradient(135deg,${C.gold},${C.me})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>Lv.{levelUp}</div>
            <Btn onClick={() => setLevelUp(null)} style={{ marginTop: 14 }}>확인</Btn>
          </div>
        </div>
      )}

      {/* 지표 토글 버튼 (개발용) */}
      <button onClick={() => setShowMetrics((v) => !v)} title="이벤트 추적 · 퍼널 지표"
        style={{ position: "fixed", right: 14, bottom: showNav ? 78 : 18, zIndex: 70, width: 46, height: 46, borderRadius: 14, border: `1px solid ${C.lineHi}`, background: C.bg2, color: C.me, cursor: "pointer", boxShadow: C.glow, fontSize: 20 }}>📊</button>

      {showMetrics && <MetricsPanel events={events} onClose={() => setShowMetrics(false)} />}
      {showInfo && <InfoModal rating={rating} level={level} xp={xp} onClose={() => setShowInfo(false)} />}
    </div>
  );
}

const TIERS = [
  { name: "브론즈", min: 0, max: "1099", color: "#c98d5b" },
  { name: "실버", min: 1100, max: "1299", color: "#c7ccda" },
  { name: "골드", min: 1300, max: "1499", color: "#ffce4d" },
  { name: "플래티넘", min: 1500, max: "1699", color: "#5ee0d0" },
  { name: "다이아", min: 1700, max: "∞", color: "#8ab6ff" },
];
function InfoModal({ rating, level, xp, onClose }) {
  const cur = TIERS.reduce((acc, t) => (rating >= t.min ? t.name : acc), "브론즈");
  const Sec = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 15, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,4,16,0.7)", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: `linear-gradient(180deg, ${C.bg2}, ${C.bg1})`, borderTop: `1px solid ${C.lineHi}`, borderRadius: "22px 22px 0 0", padding: "20px 18px 28px", maxHeight: "86vh", overflowY: "auto", animation: "rise .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: C.text }}>등급 · 레벨 안내</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <Sec title="티어 (등급)">
          레이팅 점수에 따라 5단계로 나뉩니다. 대결 상대는 <b style={{ color: C.text }}>비슷한 레이팅끼리</b> 매칭돼요.
          <div style={{ marginTop: 12, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
            {TIERS.map((t, i) => {
              const active = t.name === cur;
              return (
                <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < TIERS.length - 1 ? `1px solid ${C.line}` : "none", background: active ? `linear-gradient(90deg, ${t.color}22, transparent)` : "transparent" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: t.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontWeight: 800, color: active ? t.color : C.text }}>{t.name}{active && <span style={{ color: C.muted, fontWeight: 700, fontSize: 12 }}> · 현재</span>}</div>
                  <div style={{ color: C.muted, fontSize: 12.5, fontFamily: "monospace" }}>{t.min}–{t.max}</div>
                </div>
              );
            })}
          </div>
        </Sec>

        <Sec title="레이팅 (실력 점수)">
          대결 결과로 오르내리는 실력 지표입니다. 승리하면 <b style={{ color: C.mint }}>+24</b>, 패배하면 <b style={{ color: C.foe }}>−19</b>, 무승부는 변동 없음. 레이팅이 티어를 결정하고, 전국 순위의 기준이 됩니다.
        </Sec>

        <Sec title="레벨 (Lv) · 경험치(XP)">
          대결을 할수록 쌓이는 <b style={{ color: C.text }}>활동·숙련도 지표</b>입니다. 실력(레이팅)과 달리 져도 오릅니다. 대결마다 XP를 얻고(승리 60 + 정답 수 × 8 등), <b style={{ color: C.text }}>Lv × 120 XP</b>를 채우면 레벨업합니다. 현재 Lv.{level} · {xp} XP.
        </Sec>

        <Sec title="IQ 측정 방식 (IRT 적응형 검사)">
          문제를 맞히거나 틀릴 때마다 <b style={{ color: C.text }}>2모수 로지스틱(2PL) 문항반응이론</b>으로 능력치(θ)를 다시 추정하고, 다음 문제는 그 실력에 가까운 난이도로 자동 선택됩니다. 사전분포(θ~N(0,1))를 반영한 베이지안 추정이라 응답이 적을 때도 값이 튀지 않고 안정적입니다. 최종 IQ는 <b style={{ color: C.text }}>100 + 15θ</b>로 환산하며, 표준오차를 바탕으로 95% 신뢰구간을 함께 제공합니다.
        </Sec>

        <Sec title="고스트 대결 · 실제 참가자 랭킹">
          매칭되는 상대는 레이팅이 비슷한 <b style={{ color: C.text }}>실제 다른 참가자의 과거 플레이 기록</b>일 수 있습니다(데이터가 충분하지 않으면 시뮬레이션 상대로 대체). 랭킹 화면의 "실제 참가자 랭킹"도 실제 이용자들의 누적 기록입니다.
        </Sec>

        <Sec title="포인트 (P)">
          대결에 거는 <b style={{ color: C.text }}>인게임 재화</b>입니다. 이기면 상대 포인트를 가져오고 지면 잃습니다. 스토어에서 현금으로 충전할 수 있고, 하트가 부족할 때 <b style={{ color: C.text }}>{HEART_PRICE_POINTS}P로 하트 1개</b>를 구매하는 데 씁니다. <b style={{ color: C.gold }}>포인트를 다시 현금으로 바꿀 수는 없습니다</b> (충전은 현금→포인트 단방향이며, 포인트의 용도는 하트 구매뿐입니다).
        </Sec>

        <Sec title="아바타 꾸미기">
          스킨(아바타 색상 테마)은 처음부터 전부 무료로 골라 쓸 수 있어요. 심볼(뱃지)은 돈이나 포인트로 살 수 없고, <b style={{ color: C.text }}>레벨을 올리면 자동으로 해금</b>되는 성취 배지예요.
        </Sec>

        <Sec title="하트 (무료 대결)">
          무료 대결 횟수예요. 한 판에 1개 소모하고, <b style={{ color: C.text }}>30분당 1개</b> 자동 회복됩니다. 광고 시청이나 무제한 이용권으로도 이어서 할 수 있어요.
        </Sec>

        <Btn onClick={onClose} style={{ width: "100%", marginTop: 4 }}>확인</Btn>
      </div>
    </div>
  );
}

/* (이전 버전의 전체화면 Login 컴포넌트는 "게스트 1판 체험 후 로그인 유도" 흐름으로
   대체되어 더 이상 쓰지 않습니다. 로그인 UI는 App() 안의 "needlogin" 화면과
   홈 화면 헤더의 "카카오 로그인" 버튼에 인라인으로 들어있습니다.) */

function Score({ color, label, score, align, badgeEmoji }) {
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, flexDirection: align === "right" ? "row-reverse" : "row", boxShadow: C.shadow }}>
      <Avatar color={color} label={label === "나" ? "나" : label[0]} s={34} badgeEmoji={badgeEmoji} />
      <div style={{ textAlign: align, flex: 1, minWidth: 0 }}><div style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ fontWeight: 900, fontSize: 20, color }}>{score}</div></div>
    </div>
  );
}
const Tag = ({ color, txt, side }) => <span style={{ position: "absolute", top: -9, [side]: 8, background: color, color: "#08121a", fontSize: 10.5, fontWeight: 900, padding: "2px 7px", borderRadius: 7 }}>{txt}</span>;
const Pill = ({ children, c }) => <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.28)", border: `1px solid ${C.line}`, color: c, fontWeight: 800, fontSize: 14, padding: "8px 12px", borderRadius: 11 }}>{children}</span>;
function Row({ rank, name, right, medal, me }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: me ? `linear-gradient(135deg,${C.violetDeep}33,${C.me}22)` : C.card, border: `1px solid ${me ? C.me : C.line}`, borderRadius: 14, padding: "12px 16px", marginBottom: 8, boxShadow: C.shadow }}>
      <div style={{ width: 30, textAlign: "center", fontWeight: 900, color: me ? C.me : C.muted }}>{medal < 3 ? medals[medal] : rank}</div>
      <div style={{ flex: 1, fontWeight: 800, color: me ? C.me : C.text }}>{name}</div>
      <div style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>{right}</div>
    </div>
  );
}

/* 세션 퍼널 지표 패널 (실서비스에선 GA4/PostHog 대시보드로 대체) */
function MetricsPanel({ events, onClose }) {
  const c = (n) => events.filter((e) => e.name === n).length;
  const visit = c("visit"), start = c("battle_start"), done = c("battle_complete"), pay = c("paywall_view"), buy = c("purchase");
  const rate = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
  const rows = [
    ["접속", "visit", visit], ["대결 시작", "battle_start", start], ["대결 완료", "battle_complete", done],
    ["페이월 노출", "paywall_view", pay], ["결제", "purchase", buy],
  ];
  const kpis = [
    ["온보딩 통과율", rate(done, start), "대결 시작 → 완료", C.me],
    ["페이월 도달률", rate(pay, done), "완료 → 하트 소진", C.gold],
    ["결제 전환율", rate(buy, pay), "페이월 → 결제", C.mint],
  ];
  const recent = [...events].slice(-8).reverse();
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,4,16,0.6)", zIndex: 75, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: `linear-gradient(180deg, ${C.bg2}, ${C.bg1})`, borderTop: `1px solid ${C.lineHi}`, borderRadius: "22px 22px 0 0", padding: "20px 18px 26px", boxShadow: "0 -12px 40px rgba(0,0,0,0.5)", fontFamily: FONT, maxHeight: "82vh", overflowY: "auto", animation: "rise .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: C.text }}>이벤트 추적 · 퍼널</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>이번 세션 기준 · 실서비스에선 GA4·PostHog로 전송돼 다수 이용자 KPI가 됩니다.</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {kpis.map(([k, v, sub, col]) => (
            <div key={k} style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{v}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginTop: 3 }}>{k}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "6px 14px", marginBottom: 16 }}>
          {rows.map(([label, key, n], i) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{label} <span style={{ color: C.muted, fontSize: 11, fontFamily: "monospace" }}>{key}</span></span>
              <span style={{ color: C.me, fontWeight: 900 }}>{n}</span>
            </div>
          ))}
        </div>

        <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>최근 이벤트</div>
        <div style={{ fontFamily: "monospace", fontSize: 11.5, color: C.sub, lineHeight: 1.9 }}>
          {recent.length ? recent.map((e, i) => (
            <div key={i}>{new Date(e.t).toLocaleTimeString("ko-KR", { hour12: false })} · <span style={{ color: C.me }}>{e.name}</span>{Object.keys(e.props).length ? ` ${JSON.stringify(e.props)}` : ""}</div>
          )) : <div style={{ color: C.muted }}>아직 없음 — 대결을 시작해 보세요.</div>}
        </div>
      </div>
    </div>
  );
}

const __root = ReactDOM.createRoot(document.getElementById("root"));
__root.render(<App />);
