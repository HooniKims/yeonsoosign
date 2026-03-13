import { useDeferredValue, useEffect, useState } from "react";
import { APP_NAME } from "../lib/constants";
import { hasFirebaseConfig } from "../lib/firebase";
import { searchSchools } from "../lib/schools";

function SchoolSearchField({
  onChangeQuery,
  onClearSchool,
  onSelectSchool,
  query,
  results,
  searchState,
  selectedSchool,
}) {
  return (
    <div className="field">
      <span>학교 선택</span>
      <div className="school-search-shell">
        <input
          className="text-input"
          onChange={(event) => onChangeQuery(event.target.value)}
          placeholder="학교명을 입력해 검색해 주세요"
          value={query}
        />

        {selectedSchool ? (
          <div className="selected-school-chip">
            <div>
              <strong>{selectedSchool.schoolName}</strong>
              <span>{selectedSchool.officeName}</span>
            </div>
            <button className="ghost-button" onClick={onClearSchool} type="button">
              변경
            </button>
          </div>
        ) : null}

        {searchState === "loading" ? <p className="micro-copy">학교 정보를 찾는 중입니다...</p> : null}
        {searchState === "idle" && query.trim().length > 0 && query.trim().length < 2 ? (
          <p className="micro-copy">학교명은 두 글자 이상 입력해 주세요.</p>
        ) : null}
        {searchState === "error" ? (
          <p className="inline-feedback inline-feedback-error">
            학교 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}

        {!selectedSchool && results.length ? (
          <div className="school-search-results" role="listbox">
            {results.map((school) => (
              <button
                className="school-result-button"
                key={school.schoolId}
                onClick={() => onSelectSchool(school)}
                type="button"
              >
                <strong>{school.schoolName}</strong>
                <span>
                  {school.officeName}
                  {school.address ? ` · ${school.address}` : ""}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AuthView({
  authBusy,
  currentUser,
  intent,
  onBack,
  onCompleteOnboarding,
  onEmailLogin,
  onEmailSignup,
  onGoogleLogin,
  onGoogleSignup,
  onPendingSignOut,
  pendingAuthFlow,
}) {
  const [mode, setMode] = useState("login");
  const [localError, setLocalError] = useState("");
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [schoolQuery, setSchoolQuery] = useState("");
  const deferredSchoolQuery = useDeferredValue(schoolQuery);
  const [schoolResults, setSchoolResults] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [searchState, setSearchState] = useState("idle");

  const isSignup = mode === "signup";
  const isPendingOnboarding = Boolean(pendingAuthFlow && currentUser);
  const shouldSearchSchools = isSignup || isPendingOnboarding;

  useEffect(() => {
    if (!shouldSearchSchools) {
      setSearchState("idle");
      setSchoolResults([]);
      return undefined;
    }

    const keyword = deferredSchoolQuery.trim();

    if (selectedSchool && keyword === selectedSchool.schoolName) {
      setSearchState("idle");
      setSchoolResults([]);
      return undefined;
    }

    if (keyword.length < 2) {
      setSearchState("idle");
      setSchoolResults([]);
      return undefined;
    }

    const controller = new AbortController();
    setSearchState("loading");

    searchSchools(keyword, controller.signal)
      .then((results) => {
        setSchoolResults(results);
        setSearchState("done");
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }

        setSchoolResults([]);
        setSearchState("error");
      });

    return () => {
      controller.abort();
    };
  }, [deferredSchoolQuery, selectedSchool, shouldSearchSchools]);

  useEffect(() => {
    setLocalError("");
    setSchoolResults([]);
    setSearchState("idle");
    setSelectedSchool(null);
    setSchoolQuery(pendingAuthFlow?.suggestedSchoolName || "");
  }, [pendingAuthFlow?.suggestedSchoolName, pendingAuthFlow?.type, currentUser?.uid]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");

    if (isPendingOnboarding) {
      if (!selectedSchool) {
        setLocalError("학교를 검색 결과에서 선택해 주세요.");
        return;
      }

      await onCompleteOnboarding(selectedSchool);
      return;
    }

    if (mode === "login") {
      await onEmailLogin({
        email: form.email.trim(),
        password: form.password,
      });
      return;
    }

    if (!selectedSchool) {
      setLocalError("학교를 검색 결과에서 선택해야 가입할 수 있습니다.");
      return;
    }

    if (!form.displayName.trim()) {
      setLocalError("관리자 이름을 입력해 주세요.");
      return;
    }

    if (form.password.length < 6) {
      setLocalError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLocalError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    await onEmailSignup({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      password: form.password,
      school: selectedSchool,
    });
  }

  const googleLabel = isSignup ? "Google로 학교 관리자 가입" : "Google로 로그인";
  const title = isPendingOnboarding
    ? pendingAuthFlow.title
    : intent === "cloud_setup"
      ? "학교 설정 전용 로그인"
      : "관리자 로그인";

  return (
    <section className="page-shell auth-shell">
      <div className="page-inner page-inner-narrow">
        <div className="auth-card surface-card">
          <div className="auth-copy">
            <p className="eyebrow">Admin Access</p>
            <h1>{title}</h1>
            <p className="muted-copy">
              {isPendingOnboarding
                ? pendingAuthFlow.description
                : `${APP_NAME} 관리자 계정은 이메일 또는 Google 계정으로 이용할 수 있습니다.`}
            </p>
          </div>

          {!hasFirebaseConfig ? (
            <article className="notice-card notice-card-warm">
              <h3>Firebase 환경변수 필요</h3>
              <p>배포 환경에 Firebase 인증 설정값을 추가해야 관리자 인증을 사용할 수 있습니다.</p>
            </article>
          ) : null}

          {isPendingOnboarding ? (
            <>
              <article className="notice-card notice-card-cool">
                <h3>{pendingAuthFlow.noticeTitle}</h3>
                <p>{pendingAuthFlow.noticeBody}</p>
              </article>

              <div className="account-summary-card">
                <strong>{currentUser?.displayName || "관리자 계정"}</strong>
                <p>{currentUser?.email || "이메일 정보 없음"}</p>
                <p className="micro-copy">
                  {pendingAuthFlow.type === "signup"
                    ? "현재 로그인은 유지됩니다. 학교를 선택하면 바로 관리자 계정이 생성됩니다."
                    : "학교 정보가 없어서 관리자 화면으로 이동할 수 없습니다. 학교를 다시 선택해 저장해 주세요."}
                </p>
              </div>

              <form
                className="form-stack"
                onSubmit={async (event) => {
                  try {
                    await handleSubmit(event);
                  } catch (error) {
                    setLocalError(error.message || "입력값을 다시 확인해 주세요.");
                  }
                }}
              >
                <SchoolSearchField
                  onChangeQuery={(value) => {
                    setSchoolQuery(value);
                    setSelectedSchool(null);
                    setLocalError("");
                  }}
                  onClearSchool={() => {
                    setSelectedSchool(null);
                    setSchoolQuery("");
                  }}
                  onSelectSchool={(school) => {
                    setSelectedSchool(school);
                    setSchoolQuery(school.schoolName);
                    setSchoolResults([]);
                    setSearchState("idle");
                    setLocalError("");
                  }}
                  query={schoolQuery}
                  results={schoolResults}
                  searchState={searchState}
                  selectedSchool={selectedSchool}
                />

                <button
                  className="action-button action-button-primary action-button-full"
                  disabled={authBusy || !hasFirebaseConfig || !selectedSchool}
                  type="submit"
                >
                  {authBusy ? "처리 중..." : pendingAuthFlow.submitLabel}
                </button>

                {localError ? <p className="inline-feedback inline-feedback-error">{localError}</p> : null}
              </form>

              <div className="button-row button-row-end">
                <button className="ghost-button" onClick={onPendingSignOut} type="button">
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-segment" role="tablist" aria-label="관리자 인증 방식">
                <button
                  className={`auth-segment-button ${!isSignup ? "is-active" : ""}`}
                  onClick={() => {
                    setMode("login");
                    setLocalError("");
                  }}
                  type="button"
                >
                  로그인
                </button>
                <button
                  className={`auth-segment-button ${isSignup ? "is-active" : ""}`}
                  onClick={() => {
                    setMode("signup");
                    setLocalError("");
                  }}
                  type="button"
                >
                  관리자 가입
                </button>
              </div>

              <form
                className="form-stack"
                onSubmit={async (event) => {
                  try {
                    await handleSubmit(event);
                  } catch (error) {
                    setLocalError(error.message || "입력값을 다시 확인해 주세요.");
                  }
                }}
              >
                {isSignup ? (
                  <input
                    className="text-input"
                    onChange={(event) => updateField("displayName", event.target.value)}
                    placeholder="관리자 이름"
                    value={form.displayName}
                  />
                ) : null}

                <input
                  autoComplete="email"
                  className="text-input"
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="이메일"
                  type="email"
                  value={form.email}
                />

                <input
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="text-input"
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="비밀번호"
                  type="password"
                  value={form.password}
                />

                {isSignup ? (
                  <input
                    autoComplete="new-password"
                    className="text-input"
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    placeholder="비밀번호 확인"
                    type="password"
                    value={form.confirmPassword}
                  />
                ) : null}

                {isSignup ? (
                  <SchoolSearchField
                    onChangeQuery={(value) => {
                      setSchoolQuery(value);
                      setSelectedSchool(null);
                      setLocalError("");
                    }}
                    onClearSchool={() => {
                      setSelectedSchool(null);
                      setSchoolQuery("");
                    }}
                    onSelectSchool={(school) => {
                      setSelectedSchool(school);
                      setSchoolQuery(school.schoolName);
                      setSchoolResults([]);
                      setSearchState("idle");
                      setLocalError("");
                    }}
                    query={schoolQuery}
                    results={schoolResults}
                    searchState={searchState}
                    selectedSchool={selectedSchool}
                  />
                ) : null}

                <button
                  className="action-button action-button-primary action-button-full"
                  disabled={
                    authBusy ||
                    !hasFirebaseConfig ||
                    !form.email.trim() ||
                    !form.password ||
                    (isSignup && (!selectedSchool || !form.displayName.trim() || !form.confirmPassword))
                  }
                  type="submit"
                >
                  {authBusy ? "처리 중..." : isSignup ? "관리자 가입" : "로그인"}
                </button>

                {localError ? <p className="inline-feedback inline-feedback-error">{localError}</p> : null}
              </form>

              <div className="auth-divider">
                <span>또는</span>
              </div>

              <button
                className="action-button action-button-secondary action-button-full"
                disabled={authBusy || !hasFirebaseConfig || (isSignup && !selectedSchool)}
                onClick={() => (isSignup ? onGoogleSignup(selectedSchool) : onGoogleLogin())}
                type="button"
              >
                {googleLabel}
              </button>

              {isSignup ? (
                <p className="micro-copy">
                  학교는 반드시 검색 결과에서 선택해야 하며, 선택 없이 가입할 수 없습니다.
                </p>
              ) : null}

              <div className="button-row button-row-end">
                <button className="ghost-button" onClick={onBack} type="button">
                  돌아가기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
