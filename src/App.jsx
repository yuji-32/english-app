import { useMemo, useState } from "react";
import "./App.css";
import { Mic, Volume2 } from "lucide-react";
import { defaultWords } from "./data/defaultWords";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function App() {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState("");

  const [wordTab, setWordTab] = useState("default");
  const [defaultLevelTab, setDefaultLevelTab] = useState("easy");

  const [isListening, setIsListening] = useState(false);

  const [words, setWords] = useState(() => {
  const saved = localStorage.getItem("english_words");
  
  if (saved) {
    const parsed = JSON.parse(saved);

    const existingIds = new Set(parsed.map((w) => String(w.id)));
    const missingDefaults = defaultWords.filter(
      (w) => !existingIds.has(String(w.id))
    );

    return [...missingDefaults, ...parsed];
  }

  return defaultWords;
  });

  const [screen, setScreen] = useState("home");
  const [testWord, setTestWord] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [sortType, setSortType] = useState("new");

  const [testChoices, setTestChoices] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("");

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [missionWords, setMissionWords] = useState([]);

  const [clickedWord, setClickedWord] = useState("");
  const [feedbackWord, setFeedbackWord] = useState("");

  function getDefaultDifficulty(id) {
  const num = Number(String(id).replace("default-", ""));

  if (!num) return "user";

  if (num <= 100) return "easy";
  if (num <= 200) return "medium";
  return "hard";
}

  function normalizeWord(item) {
  return {
    ...item,
    level: item.level ?? 0,
    correct: item.correct ?? 0,
    wrong: item.wrong ?? 0,
    example: item.example ?? "",
    confusionGroup: item.confusionGroup ?? [],
    source: item.source ?? "user",
    difficulty: item.difficulty ?? getDefaultDifficulty(item.id),
  };
}

  const normalizedWords = words.map(normalizeWord);
  const easyWords = normalizedWords.filter(
    w => w.difficulty === "easy" && w.source === "default"
  );

  const mediumWords = normalizedWords.filter(
    w => w.difficulty === "medium" && w.source === "default"
  );

  const hardWords = normalizedWords.filter(
    w => w.difficulty === "hard" && w.source === "default"
  );

  const defaultWordList = normalizedWords.filter(
    (w) => w.source === "default"
  );

  const userWordList = normalizedWords.filter(
    (w) => w.source === "user"
  );

  const userWords = normalizedWords.filter(
    (w) => w.source === "user" && w.word?.trim() && w.meaning?.trim()
  );

  const visibleDefaultWords =
  defaultLevelTab === "easy"
    ? easyWords
    : defaultLevelTab === "medium"
    ? mediumWords
    : hardWords;
    
    const visibleWords = wordTab === "default" ? visibleDefaultWords : userWordList;
  
  function saveWords(newWords) {
    setWords(newWords);
    localStorage.setItem("english_words", JSON.stringify(newWords));
  }

  function shuffleArray(array) {
    const copied = [...array];
    for (let i = copied.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copied[i], copied[j]] = [copied[j], copied[i]];
    }
    return copied;
  }

  function buildChoices(correctWord, sourceWords) {
  const otherMeanings = sourceWords
    .filter(
      (w) =>
        w.id !== correctWord.id &&
        w.meaning &&
        w.meaning.trim() !== "" &&
        w.meaning !== correctWord.meaning
    )
    .map((w) => w.meaning);

  const uniqueOtherMeanings = [...new Set(otherMeanings)];
  const wrongChoices = shuffleArray(uniqueOtherMeanings).slice(0, 3);

  return shuffleArray([correctWord.meaning, ...wrongChoices]);
}

  function pickRandomWord(targetWords = normalizedWords) {
  const normalizedTargetWords = targetWords
    .map(normalizeWord)
    .filter((w) => w.word && w.meaning);

  if (normalizedTargetWords.length === 0) {
    setTestWord(null);
    setTestChoices([]);
    return;
  }

  const notMasteredWords = normalizedTargetWords.filter((w) => w.level < 3);
  const pool =
    notMasteredWords.length > 0 ? notMasteredWords : normalizedTargetWords;

  const weightedWords = pool.flatMap((w) => {
    const weight = Math.max(1, 4 - (w.level ?? 0));
    return Array(weight).fill(w);
  });

  if (weightedWords.length === 0) {
    setTestWord(null);
    setTestChoices([]);
    return;
  }

  const nextWord =
    weightedWords[Math.floor(Math.random() * weightedWords.length)];

  const choices = buildChoices(nextWord, normalizedTargetWords);

  setTestWord(nextWord);
  setTestChoices(choices);
  setAnswered(false);
  setSelectedChoice("");
}

function startTest(targetWords = normalizedWords) {
  const testableWords = targetWords.filter(
    (w) => w.word?.trim() && w.meaning?.trim()
  );

  if (testableWords.length === 0) {
    alert("テストできる単語がありません");
    return;
  }

  setScreen("test");
  pickRandomWord(testableWords);
}

  function handleAnswer(choice) {
    if (!testWord || answered) return;

    setSelectedChoice(choice);
    setAnswered(true);

    const isCorrect = choice === testWord.meaning;

    const updatedWords = normalizedWords.map((w) => {
      if (w.id !== testWord.id) return w;

      if (isCorrect) {
        return {
          ...w,
          correct: w.correct + 1,
          level: Math.min(w.level + 1, 3),
        };
      }

      return {
        ...w,
        wrong: w.wrong + 1,
        level: Math.max(w.level - 1, 0),
      };
    });

    saveWords(updatedWords);
  }

  function goNextQuestion() {
    const updatedNormalizedWords = words.map(normalizeWord);
    pickRandomWord(updatedNormalizedWords);
  }

  function deleteWord(id) {
    const newWords = words.filter((w) => w.id !== id);
    saveWords(newWords);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setWord(item.word);
    setMeaning(item.meaning);
    setExample(item.example || "");
    setSuggestionMessage("編集中です");
  }

  function cancelEdit() {
    setEditingId(null);
    setWord("");
    setMeaning("");
    setExample("");
    setSuggestions([]);
    setSuggestionMessage("");
  }

  function addOrUpdateWord() {
    const trimmedWord = word.trim();
    const trimmedMeaning = meaning.trim();
    const trimmedExample = example.trim();

    if (trimmedWord === "" && trimmedMeaning === "") return;

    if (editingId) {
      const updatedWords = words.map((w) =>
        w.id === editingId
          ? {
              ...w,
              word: trimmedWord,
              meaning: trimmedMeaning,
              example: trimmedExample,
            }
          : w
      );
      saveWords(updatedWords);
      setSuggestionMessage("単語を更新しました");
    } else {
      const newWord = {
        id: Date.now(),
        word: trimmedWord,
        meaning: trimmedMeaning,
        example: trimmedExample,
        correct: 0,
        wrong: 0,
        level: 0,
        confusionGroup: [],
        source: "user",
      };

      saveWords([newWord, ...words]);
      setSuggestionMessage("単語を登録しました");
    }

    setEditingId(null);
    setWord("");
    setMeaning("");
    setExample("");
    setSuggestions([]);
  }

  async function searchSuggestion() {
    const query = word.trim() || meaning.trim();

    if (!query) {
      setSuggestionMessage("英語か日本語のどちらかを入力してください");
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestion(true);
    setSuggestionMessage("");
    setSuggestions([]);

    try {
      const res = await fetch(
        `${API_BASE_URL}/suggest?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setSuggestionMessage("候補が見つかりませんでした");
        setSuggestions([]);
      } else {
        setSuggestions(data);
        setSuggestionMessage(`${data.length}件の候補が見つかりました`);
      }
    } catch (error) {
      console.error(error);
      setSuggestionMessage("候補の取得に失敗しました");
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestion(false);
    }
  }

  async function handleWordClick(word) {
  const lowerWord = word.toLowerCase();

  const exists = words.some(
    (w) => w.word.toLowerCase() === lowerWord
  );

  setClickedWord(word);

  if (exists) {
    setFeedbackWord("すでに登録済み");
    return;
  }

  let translated = "";

  try {
    const res = await fetch(
      `${API_BASE_URL}/translate?text=${encodeURIComponent(word)}`
    );
    const data = await res.json();

    translated = data?.translated?.trim() || "";
  } catch (e) {
    console.error(e);
  }

  const newWord = {
    id: Date.now(),
    word: word.trim(),
    meaning: translated,
    example: "",
    correct: 0,
    wrong: 0,
    level: 0,
    confusionGroup: [],
    source: "user",
  };

  saveWords([newWord, ...words]);

  setFeedbackWord("登録しました");

  setTimeout(() => {
    setFeedbackWord("");
    setClickedWord("");
  }, 2000);
}

  function applySuggestion(item, selectedMeaning = null) {
    if (item.word) {
      setWord(item.word);
    }

    if (selectedMeaning) {
      setMeaning(selectedMeaning);
    } else if (item.meanings && item.meanings.length > 0) {
      setMeaning(item.meanings[0]);
    }

    setSuggestionMessage("候補を入力欄に反映しました");
  }

  async function translateToJapanese() {
  const text = word.trim();

  if (!text) {
    setSuggestionMessage("英語を入力してください");
    return;
  }

  setIsLoadingSuggestion(true);
  setSuggestionMessage("");

  try {
    const res = await fetch(
      `${API_BASE_URL}/translate?text=${encodeURIComponent(text)}`
    );
    const data = await res.json();

    if (!data.translated) {
      setSuggestionMessage("意味を取得できませんでした");
      return;
    }

    setMeaning(data.translated);
    setSuggestionMessage("意味を自動入力しました");
  } catch (error) {
    console.error(error);
    setSuggestionMessage("翻訳に失敗しました");
  } finally {
    setIsLoadingSuggestion(false);
  }
}

  function getLevelLabel(level) {
    switch (level) {
      case 0:
        return "苦手";
      case 1:
        return "練習中";
      case 2:
        return "あと少し";
      case 3:
        return "覚えた";
      default:
        return "未設定";
    }
  }

  function startChatMission() {
  const targets = weakWords.slice(0, 3).map((w) => w.word);

  setMissionWords(targets);

  setChatMessages([
    {
      role: "assistant",
      english: "Let's practice English. Feel free to talk to me about anything.",
      japanese: "英会話を練習しよう。なんでも話しかけてね。",
      correction: "",
      usedWords: [],
    },
  ]);

  setChatInput("");
  setScreen("chat");
}

async function sendChatMessage() {
  const message = chatInput.trim();
  if (!message) return;

  const newUserMessage = {
    role: "user",
    english: message,
  };

  const updatedMessages = [...chatMessages, newUserMessage];
  setChatMessages(updatedMessages);
  setChatInput("");
  setIsChatLoading(true);

  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        missionWords,
        history: updatedMessages,
      }),
    });

    const data = await res.json();

    setChatMessages([
      ...updatedMessages,
      {
        role: "assistant",
        english: data.english,
        japanese: data.japanese,
        correction: data.correction,
        usedWords: data.usedWords || [],
      },
    ]);
  } catch (error) {
    console.error(error);
    setChatMessages([
      ...updatedMessages,
      {
        role: "assistant",
        english: "Sorry, I couldn't reply.",
        japanese: "ごめん、返答できませんでした。",
        correction: "通信エラーが発生しました。",
        usedWords: [],
      },
    ]);
  } finally {
    setIsChatLoading(false);
  }
}

function startVoiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

    const isVoiceInputSupported = !!SpeechRecognition;
  if (!SpeechRecognition) {
    alert("このブラウザは音声入力に対応していません。ChromeかEdgeで試してください。");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    setIsListening(true);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setChatInput(transcript);
  };

  recognition.onerror = () => {
    alert("音声入力に失敗しました。もう一度試してください。");
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.start();
}

function speakText(text) {
  if (!window.speechSynthesis) {
    alert("このブラウザは音声読み上げに対応していません。");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function splitWords(text) {
  return text
    .replace(/[.,!?;:"]/g, "")
    .split(/\s+/)
    .filter((w) => w !== "");
}

  const filteredWords = normalizedWords.filter((w) => {
    const text = `${w.word} ${w.meaning} ${w.example || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const displayWords = [...filteredWords].sort((a, b) => {
    switch (sortType) {
      case "old":
        return a.id - b.id;
      case "weak":
        return b.wrong - b.correct - (a.wrong - a.correct);
      case "az":
        return a.word.localeCompare(b.word);
      case "level":
        return a.level - b.level;
      case "new":
      default:
        return b.id - a.id;
    }
  });

  const memoryRate = useMemo(() => {
    if (normalizedWords.length === 0) return 0;

    let totalCorrect = 0;
    let totalAnswered = 0;

    normalizedWords.forEach((w) => {
      totalCorrect += w.correct;
      totalAnswered += w.correct + w.wrong;
    });

    if (totalAnswered === 0) return 0;

    return Math.round((totalCorrect / totalAnswered) * 100);
  }, [normalizedWords]);

  const weakWords = normalizedWords
    .filter((w) => w.wrong > w.correct)
    .sort((a, b) => b.wrong - a.wrong);

    if (screen === "list") {
  const visibleDefaultWords =
    defaultLevelTab === "easy"
      ? easyWords
      : defaultLevelTab === "medium"
      ? mediumWords
      : hardWords;

      const visibleWordsRaw =
      wordTab === "default" ? visibleDefaultWords : userWordList;

      const visibleWords = visibleWordsRaw.filter((w) => {
        const text = `${w.word} ${w.meaning} ${w.example || ""}`.toLowerCase();
        return text.includes(search.toLowerCase());
      });

  return (
    <div className="app">
      <div className="topbar">
        <h1 className="title">登録した単語</h1>

        <div className="button-group">
          <button
            className={
              wordTab === "default" ? "primary-button" : "secondary-button"
            }
            onClick={() => setWordTab("default")}
          >
            初期単語
          </button>

          <button
            className={
              wordTab === "user" ? "primary-button" : "secondary-button"
            }
            onClick={() => setWordTab("user")}
          >
            自分の単語
          </button>
        </div>

        <button
          className="secondary-button"
          onClick={() => setScreen("home")}
        >
          ← ホーム
        </button>
      </div>

      <div className="card">
        <h2>検索</h2>
        <input
          className="input"
          placeholder="単語・意味・例文で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {wordTab === "default" && (
        <div className="card">
          <div className="button-group">
            <button
              className={
                defaultLevelTab === "easy"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() => setDefaultLevelTab("easy")}
            >
              簡単
            </button>

            <button
              className={
                defaultLevelTab === "medium"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() => setDefaultLevelTab("medium")}
            >
              普通
            </button>

            <button
              className={
                defaultLevelTab === "hard"
                  ? "primary-button"
                  : "secondary-button"
              }
              onClick={() => setDefaultLevelTab("hard")}
            >
              難しい
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>単語一覧</h2>

        {visibleWords.length === 0 ? (
          <p className="empty-text">単語がありません</p>
        ) : (
          <div className="word-list">
            {visibleWords.map((w) => {
              const total = w.correct + w.wrong;
              const rate =
                total === 0 ? 0 : Math.round((w.correct / total) * 100);

              return (
                <div className="word-card" key={w.id}>
                  <div className="word-header">
                    <div>
                      <div className="word-title">
                        {w.word || "（英語未入力）"}
                      </div>
                      <div className="word-meaning">
                        {w.meaning || "（日本語未入力）"}
                      </div>
                    </div>

                    <div className="button-group">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          startEdit(w);
                          setScreen("home");
                        }}
                      >
                        編集
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => deleteWord(w.id)}
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  {w.example && (
                    <div className="example-text">例文: {w.example}</div>
                  )}

                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                      習熟度 {rate}%
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "#eee",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${rate}%`,
                          height: "100%",
                          background: "#4caf50",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>苦手な単語</h2>

        {weakWords.length === 0 ? (
          <p className="empty-text">まだ苦手単語はありません</p>
        ) : (
          <div className="weak-list">
            {weakWords.slice(0, 5).map((w) => (
              <div className="weak-item" key={w.id}>
                <strong>{w.word || "（英語未入力）"}</strong> -{" "}
                {w.meaning || "（日本語未入力）"}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

if (screen === "testMenu") {
  return (
    <div className="app">
      <div className="topbar">
        <h1 className="title">テスト選択</h1>
        <button
          className="secondary-button"
          onClick={() => setScreen("home")}
        >
          ← ホーム
        </button>
      </div>

      <div className="card">
        <h2>難易度を選択</h2>

        <div className="button-group">
          <button
            className="primary-button full-button"
            onClick={() => startTest(easyWords)}
          >
            簡単
          </button>

          <button
            className="primary-button full-button"
            onClick={() => startTest(mediumWords)}
          >
            普通
          </button>

          <button
            className="primary-button full-button"
            onClick={() => startTest(hardWords)}
          >
            難しい
          </button>

          <button
          className="secondary-button full-button"
          onClick={() => startTest(userWords)}
          >
            自分の単語
          </button>
        </div>
      </div>
    </div>
  );
}

if (screen === "test") {
  return (
    <div className="app">
      <div className="topbar">
        <h1 className="title">4択テスト</h1>
        <button className="secondary-button" onClick={() => setScreen("home")}>
          ← ホーム
        </button>
      </div>

      {!testWord ? (
        <div className="card">
          <p className="empty-text">テストできる単語がありません</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>問題</h2>
            <div className="word-title" style={{ fontSize: "28px" }}>
              {testWord.word}
            </div>
            {testWord.example && (
              <div className="example-text">例文: {testWord.example}</div>
            )}
          </div>

          <div className="card">
            <h2>選択肢</h2>
            <div className="button-group" style={{ flexDirection: "column" }}>
              {testChoices.map((choice, index) => {
                const isCorrect = choice === testWord.meaning;
                const isSelected = choice === selectedChoice;

                let className = "secondary-button full-button";
                if (answered && isCorrect) className = "good-button full-button";
                if (answered && isSelected && !isCorrect) {
                  className = "bad-button full-button";
                }

                return (
                  <button
                    key={`${choice}-${index}`}
                    className={className}
                    onClick={() => handleAnswer(choice)}
                    disabled={answered}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>

          {answered && (
            <div className="card">
              <h2>結果</h2>
              <p className="stats">
                {selectedChoice === testWord.meaning ? "正解！" : "不正解"}
              </p>
              <p className="stats">正解: {testWord.meaning}</p>
              <p className="stats">
                状態: {getLevelLabel(testWord.level ?? 0)}
              </p>

              <div className="button-group">
                <button className="primary-button" onClick={goNextQuestion}>
                  次の問題へ
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setScreen("home")}
                >
                  ホームへ戻る
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

if (screen === "chat") {
  return (
    <div className="app">
      <div className="topbar">
        <h1 className="title">AI英会話</h1>
        <button className="secondary-button" onClick={() => setScreen("home")}>
          ← ホーム
        </button>
      </div>

      <div className="card">
        <h2>単語使用ミッション</h2>
        {missionWords.length === 0 ? (
          <p className="empty-text">ミッション単語はありません</p>
        ) : (
          <div className="meaning-tags">
            {missionWords.map((item, index) => (
              <span key={`${item}-${index}`} className="meaning-chip">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>会話</h2>
        <div className="word-list">
          {chatMessages.map((msg, index) => (
            <div className="word-card" key={index}>
              <div className="stats">
                {msg.role === "user" ? "あなた" : "AI"}
              </div>

              <div className="word-title" style={{ fontSize: "18px" }}>
                {splitWords(msg.english).map((w, i) => (
                  <span key={i} style={{ marginRight: "6px" }}>
                    <span
                    title="クリックして単語帳に登録"
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px dotted #999",
                    }}
                    onClick={() => handleWordClick(w)}
                    >
                      {w}
                      </span>
                      {clickedWord === w && feedbackWord && (
                        <div
                        style={{
                          fontSize: "12px",
                          color: "#2563eb",
                          marginTop: "2px",
                        }}
                        >
                          {feedbackWord}
                          </div>
                        )}
                        </span>
                      ))}
                  </div>

                  {msg.role === "assistant" && (
                    <button
                    className="secondary-button"
                    onClick={() => speakText(msg.english)}
                    >
                      <Volume2 size={20} />
                    </button>
                  )}

              {msg.japanese && (
                <div className="example-text">日本語: {msg.japanese}</div>
              )}

              {msg.correction && (
                <div className="stats">添削: {msg.correction}</div>
              )}

              {msg.usedWords && msg.usedWords.length > 0 && (
                <div className="stats">
                  使えた単語: {msg.usedWords.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>英語を入力</h2>
        <textarea
          className="input textarea"
          placeholder="英語で入力してみよう"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
        />

        <div className="button-group">
          <button
          className="icon-button"
          onClick={startVoiceInput}
          >
            <Mic size={20} color={isListening ? "red" : "white"} />
          </button>

          {!isVoiceInputSupported && (
            <p className="helper-text">
              このブラウザは音声入力に対応していません。ChromeまたはEdgeで試してください。
            </p>
          )}

          <button
            className="primary-button"
            onClick={sendChatMessage}
            disabled={isChatLoading}
          >
            {isChatLoading ? "送信中..." : "送信"}
          </button>
        </div>
        {suggestionMessage && (
          <p className="helper-text">{suggestionMessage}</p>
          )}
      </div>
    </div>
  );
}

return (
  <div className="app">
    <div className="topbar">
      <h1 className="title">英単語アプリ</h1>
    </div>

    <div className="summary-grid">
      <div className="summary-card">
        <div className="summary-label">登録単語数</div>
        <div className="summary-value">{words.length}</div>
      </div>
      <div className="summary-card">
        <div className="summary-label">覚えてる割合</div>
        <div className="summary-value">{memoryRate}%</div>
      </div>
    </div>

    <div className="home-menu">
  <button
    className="menu-btn primary"
    onClick={() => setScreen("testMenu")}
  >
    テスト
  </button>

  <button
    className="menu-btn"
    onClick={() => setScreen("list")}
  >
    単語一覧
  </button>

  <button
    className="menu-btn"
    onClick={startChatMission}
  >
    AI英会話
  </button>
</div>

    <div className="card">
      <h2>{editingId ? "単語を編集" : "単語を登録"}</h2>

      <div className="form-grid">
        <label className="label">English</label>
        <input
          className="input"
          placeholder="English"
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />

        <label className="label">日本語</label>
        <input
          className="input"
          placeholder="日本語"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
        />

        <label className="label">例文（任意）</label>
        <textarea
          className="input textarea"
          placeholder="例文（任意）"
          value={example}
          onChange={(e) => setExample(e.target.value)}
        />

        <div className="button-group">
          <button
            className="secondary-button"
            onClick={searchSuggestion}
            disabled={isLoadingSuggestion}
          >
            {isLoadingSuggestion ? "検索中..." : "候補を探す"}
          </button>

          <button
            className="secondary-button"
            onClick={translateToJapanese}
            disabled={isLoadingSuggestion}
          >
            {isLoadingSuggestion ? "翻訳中..." : "翻訳"}
          </button>

          <button className="primary-button" onClick={addOrUpdateWord}>
            {editingId ? "更新" : "追加"}
          </button>

          {editingId && (
            <button className="secondary-button" onClick={cancelEdit}>
              キャンセル
            </button>
          )}
        </div>

        {suggestionMessage && (
          <p className="helper-text">{suggestionMessage}</p>
        )}

        {suggestions.length > 0 && (
          <div className="suggestion-list">
            {suggestions.map((item, index) => (
              <div className="suggestion-card" key={`${item.word}-${index}`}>
                <div className="suggestion-header">
                  <div>
                    <div className="word-title">{item.word}</div>

                    {item.readings && item.readings.length > 0 && (
                      <div className="stats">
                        読み: {item.readings.join(" / ")}
                      </div>
                    )}

                    {item.pos && item.pos.length > 0 && (
                      <div className="stats">
                        品詞: {item.pos.join(" / ")}
                      </div>
                    )}
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => applySuggestion(item)}
                  >
                    この候補を使う
                  </button>
                </div>

                <div className="meaning-tags">
                  {item.meanings &&
                    item.meanings.map((m, i) => (
                      <button
                        key={`${item.word}-${m}-${i}`}
                        className="meaning-chip"
                        onClick={() => applySuggestion(item, m)}
                      >
                        {m}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
}

export default App;