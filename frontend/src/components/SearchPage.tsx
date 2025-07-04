/// <reference path="../types/window.d.ts" />

import styles from "./SearchPage.module.css";
import type { SearchResult, SearchHistoryItem } from "../types/search";
import { useState, useEffect, useRef, useCallback, ReactNode } from "react"
import { History, Mic, Search, Square } from "lucide-react"
import HistoryPanel from "./HistoryPanel.tsx"
import ResultsPanel from "./ResultsPanel.tsx"
import { formatDate } from "../lib/utils.ts"
import MathLiveField, { MathLiveFieldHandle } from "./MathLiveField"
import "mathlive"

const API_BASE =
    process.env.NODE_ENV === "development"
        ? "http://localhost:5000"
        : "https://api.mathmex.com";

export default function SearchPage() {
    // --- Initialize search param from URL ---
    const searchParam = new URLSearchParams(window.location.search).get("q") || "";
    const initialLatex = searchParam ? decodeURIComponent(searchParam) : "";

    // --- State Hooks ---
    const [latex, setLatex] = useState<string>(initialLatex)
    const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false)
    const [isListening, setIsListening] = useState<boolean>(false)
    const [transcript, setTranscript] = useState<string>("")
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
    const [placeholderMessage, setPlaceholderMessage] = useState<ReactNode>(null)
    const [mode, setMode] = useState<"math" | "text">("text")

    const mathFieldRef = useRef<MathLiveFieldHandle>(null)
    const recognitionRef = useRef<SpeechRecognition | null>(null)

    // --- Send transcript to backend when listening stops ---
    useEffect(() => {
        if (!isListening && transcript) {
            speechToLatex(transcript)
            setTranscript("")
        }
    }, [isListening])

    // --- Load search history and set placeholder on mount ---
    useEffect(() => {
        const storedHistory = sessionStorage.getItem("mathMexSearchHistory")
        if (storedHistory) {
            setSearchHistory(JSON.parse(storedHistory))
        }
        setPlaceholderMessage(
            <div className={styles.resultsPlaceholderMessage}>
                <p>Enter a statement with text and math, e.g. "The area is $a^2$"</p>
                <p>
                    Example: Try searching for{" "}
                    <span
                        className="example"
                        onClick={() =>
                            handleExampleClick(
                                "The circulation is $\\oint_C \\vec{F} \\cdot d\\vec{r} = \\iint_S (\\nabla \\times \\vec{F}) \\cdot d\\vec{S}$",
                            )
                        }
                    >
                        Stokes' Theorem
                    </span>{" "}
                    or{" "}
                    <span className="example" onClick={() => handleExampleClick("Euler's identity: $e^{i\\pi} + 1 = 0$")}>
                        Euler's Identity
                    </span>
                </p>
            </div>,
        )
    }, [])

    // --- Speech-to-LaTeX ---
    const toggleSpeechRecognition = () => {
        if (isListening) {
            recognitionRef.current?.stop()
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            console.error("Speech recognition not supported in this browser.")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"
        recognitionRef.current = recognition

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = ""
            let finalTranscript = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPart = event.results[i][0].transcript
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPart
                } else {
                    interimTranscript += transcriptPart
                }
            }
            setTranscript(finalTranscript)
        }

        recognition.onend = () => {
            setIsListening(false)
            recognitionRef.current = null
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", event.error)
            setIsListening(false)
        }

        recognition.start()
        setIsListening(true)
    }

    const speechToLatex = (text: string) => {
        fetch(`${API_BASE}/speech-to-latex`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.latex && mathFieldRef.current) {
                    mathFieldRef.current.insertAtCursor(data.latex)
                }
            })
            .catch((err) => {
                console.error("Error converting speech to LaTeX", err);
            });
    };

    // --- Helpers for search history ---
    const updateAndStoreHistory = (newHistory: SearchHistoryItem[]) => {
        setSearchHistory(newHistory)
        sessionStorage.setItem("mathMexSearchHistory", JSON.stringify(newHistory))
    }

    const addToHistory = (query: string) => {
        if (!query) return
        const newItem: SearchHistoryItem = { latex: query, timestamp: Date.now() }
        let updatedHistory = searchHistory.filter((item) => item.latex !== query)
        updatedHistory.push(newItem)
        if (updatedHistory.length > 15) {
            updatedHistory = updatedHistory.slice(-15)
        }
        updateAndStoreHistory(updatedHistory)
    }

    // --- Main search function: sends LaTeX to backend ---
    const performSearch = useCallback(() => {
        const currentLatex = latex.trim();
        if (!currentLatex) return;

        setIsLoading(true)
        setSearchResults([])
        addToHistory(currentLatex)
        if (isHistoryVisible) setIsHistoryVisible(false)

        fetch(`${API_BASE}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: "",
                functionLatex: "",
                latex: currentLatex,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setSearchResults(data.results || [])
                setIsLoading(false)
            })
            .catch(() => {
                setSearchResults([])
                setIsLoading(false)
            })
    }, [latex, searchHistory, isHistoryVisible])

    // --- Fill input with example and trigger search ---
    const handleExampleClick = (formula: string) => {
        setLatex(formula)
        setTimeout(() => {
            performSearch()
        }, 0)
    }

    // --- Clear search history ---
    const clearHistory = () => {
        updateAndStoreHistory([])
    }

    // --- Handle click on a history item ---
    const handleHistoryItemClick = (itemLatex: string) => {
        setLatex(itemLatex)
        setIsHistoryVisible(false)
        setTimeout(() => {
            performSearch()
        }, 0)
    }

    // --- Sync mode state with MathLiveField events ---
    useEffect(() => {
        const el = mathFieldRef.current?.fieldRef.current;
        if (!el) return;
        const handler = (evt: any) => setMode(evt.detail.mode);
        el.addEventListener("mode-change", handler);
        // Set initial mode
        setMode(el.mode || "text");
        return () => el.removeEventListener("mode-change", handler);
    }, [mathFieldRef]);

    // --- Render the search page ---
    return (
        <>
            <main className="container">
                <div className="scroll-decoration top"></div>
                <section className={styles.searchSection}>
                    <div className={styles.searchContainer}>
                        <div className={styles.searchInputContainer}>
                            {/* Custom placeholder overlay */}
                            {!latex && (
                                <div className={`${styles.placeholderOverlay} ${latex ? styles.hidden : ''}`}>
                                    Enter a statement with text and math, e.g. "The area is $a^2$"
                                </div>
                            )}
                            {/* MathLiveField for inline text+math */}
                            <MathLiveField
                                ref={mathFieldRef}
                                value={latex}
                                onChange={setLatex}
                                className={styles.inputField}
                            />
                            <button className={styles.searchButton} onClick={performSearch} disabled={isLoading}>
                                <Search size={18} />
                                <span>{isLoading ? "Searching..." : "Search"}</span>
                            </button>
                        </div>
                        {/* Controls for history, mic, and mode toggle */}
                        <div className={styles.searchControls}>
                            <div className={styles.keyboardToggleContainer}>
                                <div className={styles.modeSwitch}>
                                    <label className={styles.switchLabel}>
                                        <input
                                            type="checkbox"
                                            checked={mode === "math"}
                                            onChange={() => {
                                                const el = mathFieldRef.current?.fieldRef.current;
                                                if (el && el.executeCommand) {
                                                    const newMode = mode === "math" ? "text" : "math";
                                                    el.executeCommand("switchMode", newMode);
                                                    el.focus();
                                                    setMode(newMode);
                                                }
                                            }}
                                            aria-label="Toggle math/text mode"
                                        />
                                        <span className={styles.switchSlider}></span>
                                        <span className={styles.switchText}>
                                            {mode === "math" ? "Math" : "Text"}
                                        </span>
                                    </label>
                                </div>
                                <button
                                    className={`${styles.controlButton} ${isListening ? styles.listening : ""}`}
                                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                                    onClick={toggleSpeechRecognition}
                                >
                                    {isListening ? <Square size={20} strokeWidth={2.5} /> : <Mic size={20} />}
                                </button>
                                <button
                                    className={styles.controlButton}
                                    aria-label="Search history"
                                    onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                                >
                                    <History size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Show search history panel if visible */}
                    {isHistoryVisible && (
                        <HistoryPanel
                            history={searchHistory.slice().reverse()}
                            onClearHistory={clearHistory}
                            onHistoryItemClick={handleHistoryItemClick}
                            formatDate={formatDate}
                        />
                    )}
                </section>

                {/* Results panel */}
                <ResultsPanel results={searchResults} isLoading={isLoading} placeholderMessage={placeholderMessage} />

                <div className="scroll-decoration bottom"></div>
            </main>
        </>
    )
}