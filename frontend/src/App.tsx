import { useState } from 'react'
import './App.css'

interface WordDiff {
  type: 'equal' | 'delete' | 'insert'
  text: string
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'modify'
  original_line: number | null
  modified_line: number | null
  original_content: string | null
  modified_content: string | null
  word_diffs: WordDiff[] | null
}

type ViewMode = 'split' | 'unified'

interface HistoryState {
  original: string
  modified: string
  timestamp: number
}

function App() {
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [loading, setLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null)
  const [selectedLineRange, setSelectedLineRange] = useState<{ start: number; end: number } | null>(null)
  const [currentOriginal, setCurrentOriginal] = useState('')
  const [currentModified, setCurrentModified] = useState('')
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const handleCheckDifference = async () => {
    setLoading(true)
    setCurrentOriginal(original)
    setCurrentModified(modified)
    
    // Initialize history
    setHistory([{ original, modified, timestamp: Date.now() }])
    setHistoryIndex(0)
    
    try {
      const response = await fetch('http://localhost:8000/api/diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ original, modified }),
      })
      const data = await response.json()
      setDiff(data)
      setShowDiff(true)
      setSelectedLineIndex(null)
      setSelectedLineRange(null)
    } catch (error) {
      console.error('Error calculating diff:', error)
      alert('Error calculating difference. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const saveToHistory = (newOriginal: string, newModified: string) => {
    const newState: HistoryState = {
      original: newOriginal,
      modified: newModified,
      timestamp: Date.now()
    }
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(historyIndex + 1)
    }
    
    setHistory(newHistory)
  }

  const handleUndo = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const state = history[newIndex]
      
      setOriginal(state.original)
      setModified(state.modified)
      setCurrentOriginal(state.original)
      setCurrentModified(state.modified)
      setHistoryIndex(newIndex)
      
      await recalculateDiff(state.original, state.modified)
      showToast('Undone')
    }
  }

  const handleRedo = async () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const state = history[newIndex]
      
      setOriginal(state.original)
      setModified(state.modified)
      setCurrentOriginal(state.original)
      setCurrentModified(state.modified)
      setHistoryIndex(newIndex)
      
      await recalculateDiff(state.original, state.modified)
      showToast('Redone')
    }
  }

  const handleMergeToModified = (lineIndex: number) => {
    const range = selectedLineRange || { start: lineIndex, end: lineIndex }
    // const originalLines = currentOriginal.split('\n')
    const modifiedLines = currentModified.split('\n')

    // Collect all lines in the range
    for (let i = range.start; i <= range.end; i++) {
      const line = diff[i]
      if (!line) continue

      if (line.type === 'remove' && line.original_line && line.original_content) {
        // Insert removed line into modified at the corresponding position
        const insertIndex = line.modified_line || modifiedLines.length
        modifiedLines.splice(insertIndex, 0, line.original_content)
      } else if (line.type === 'modify' && line.original_line && line.modified_line && line.original_content) {
        // Replace modified line with original
        modifiedLines[line.modified_line - 1] = line.original_content
      }
    }

    const newModified = modifiedLines.join('\n')
    setModified(newModified)
    setCurrentModified(newModified)
    setSelectedLineIndex(null)
    setSelectedLineRange(null)
    
    // Save to history
    saveToHistory(currentOriginal, newModified)
    
    // Recalculate diff
    recalculateDiff(currentOriginal, newModified)
    showToast('Merged to modified')
  }

  const handleMergeToOriginal = (lineIndex: number) => {
    const range = selectedLineRange || { start: lineIndex, end: lineIndex }
    const originalLines = currentOriginal.split('\n')
    // const modifiedLines = currentModified.split('\n')

    // Collect all lines in the range
    for (let i = range.start; i <= range.end; i++) {
      const line = diff[i]
      if (!line) continue

      if (line.type === 'add' && line.modified_line && line.modified_content) {
        // Insert added line into original at the corresponding position
        const insertIndex = line.original_line || originalLines.length
        originalLines.splice(insertIndex, 0, line.modified_content)
      } else if (line.type === 'modify' && line.original_line && line.modified_line && line.modified_content) {
        // Replace original line with modified
        originalLines[line.original_line - 1] = line.modified_content
      }
    }

    const newOriginal = originalLines.join('\n')
    setOriginal(newOriginal)
    setCurrentOriginal(newOriginal)
    setSelectedLineIndex(null)
    setSelectedLineRange(null)
    
    // Save to history
    saveToHistory(newOriginal, currentModified)
    
    // Recalculate diff
    recalculateDiff(newOriginal, currentModified)
    showToast('Merged to original')
  }

  const recalculateDiff = async (orig: string, mod: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ original: orig, modified: mod }),
      })
      const data = await response.json()
      setDiff(data)
    } catch (error) {
      console.error('Error recalculating diff:', error)
    }
  }

  const handleLineClick = (index: number, line: DiffLine) => {
    if (line.type === 'context') return
    
    // If shift key is held and there's already a selection, extend the range
    if (selectedLineIndex !== null && selectedLineIndex !== index) {
      const start = Math.min(selectedLineIndex, index)
      const end = Math.max(selectedLineIndex, index)
      
      // Check if all lines in range are changeable
      let allChangeable = true
      for (let i = start; i <= end; i++) {
        if (diff[i]?.type === 'context') {
          allChangeable = false
          break
        }
      }
      
      if (allChangeable) {
        setSelectedLineRange({ start, end })
        return
      }
    }
    
    // Single line selection
    if (selectedLineIndex === index) {
      setSelectedLineIndex(null)
      setSelectedLineRange(null)
    } else {
      setSelectedLineIndex(index)
      setSelectedLineRange(null)
    }
  }

  const showToast = (message: string) => {
    setToast({ message, visible: true })
    setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 2000)
  }

  const handleCopyOriginal = async () => {
    try {
      await navigator.clipboard.writeText(currentOriginal)
      showToast('Copied original section!')
    } catch (error) {
      console.error('Failed to copy:', error)
      showToast('Failed to copy')
    }
  }

  const handleCopyModified = async () => {
    try {
      await navigator.clipboard.writeText(currentModified)
      showToast('Copied updated section!')
    } catch (error) {
      console.error('Failed to copy:', error)
      showToast('Failed to copy')
    }
  }

  const CopyIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  )

  const UndoIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1.22 6.28a.75.75 0 0 0 1.06 0L4.5 4.06l2.22 2.22a.75.75 0 0 0 1.06-1.06L5.56 3l2.22-2.22a.75.75 0 0 0-1.06-1.06L4.5 1.94 2.28-.28a.75.75 0 0 0-1.06 1.06L3.44 3 1.22 5.22a.75.75 0 0 0 0 1.06Z" />
      <path d="M4.5 7a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 0 .75.75h5.25a2.75 2.75 0 0 0 0-5.5H9a.75.75 0 0 1 0-1.5h2.25a4.25 4.25 0 0 1 0 8.5H6a2.25 2.25 0 0 1-2.25-2.25v-2.5A.75.75 0 0 1 4.5 7Z" />
    </svg>
  )

  const RedoIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14.78 6.28a.75.75 0 0 1-1.06 0L11.5 4.06 9.28 6.28a.75.75 0 0 1-1.06-1.06L10.44 3 8.22.78a.75.75 0 0 1 1.06-1.06L11.5 1.94l2.22-2.22a.75.75 0 0 1 1.06 1.06L12.56 3l2.22 2.22a.75.75 0 0 1 0 1.06Z" />
      <path d="M11.5 7a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75H4.75a2.75 2.75 0 0 1 0-5.5H7a.75.75 0 0 0 0-1.5H4.75a4.25 4.25 0 0 0 0 8.5H10a2.25 2.25 0 0 0 2.25-2.25v-2.5A.75.75 0 0 0 11.5 7Z" />
    </svg>
  )

  const renderWordDiff = (wordDiffs: WordDiff[]) => {
    return wordDiffs.map((word, idx) => {
      if (word.type === 'equal') {
        return <span key={idx}>{word.text}</span>
      } else if (word.type === 'delete') {
        return (
          <span key={idx} className="word-delete">
            {word.text}
          </span>
        )
      } else {
        return (
          <span key={idx} className="word-insert">
            {word.text}
          </span>
        )
      }
    })
  }

  const renderSplitView = () => {
    return (
      <div className="diff-content split-view">
        <div className="split-view-header">
          <div className="split-header-section">
            <span className="section-label">Original Text</span>
            <button
              className="copy-btn-inline"
              onClick={handleCopyOriginal}
              title="Copy original section"
            >
              <CopyIcon />
            </button>
          </div>
          <div className="split-header-section">
            <span className="section-label">Updated Text</span>
            <button
              className="copy-btn-inline"
              onClick={handleCopyModified}
              title="Copy updated section"
            >
              <CopyIcon />
            </button>
          </div>
        </div>
        {diff.map((line, index) => {
          const isChangeable = line.type !== 'context'
          const isSelected = selectedLineIndex === index || 
            (selectedLineRange && index >= selectedLineRange.start && index <= selectedLineRange.end)
          const isRangeStart = selectedLineRange && index === selectedLineRange.start

          return (
            <div key={index}>
              {isRangeStart && (
                <div className="merge-controls">
                  <button
                    className="merge-btn"
                    onClick={() => handleMergeToModified(index)}
                  >
                    ← Use Original ({selectedLineRange.end - selectedLineRange.start + 1} lines)
                  </button>
                  <span>Merge Selection</span>
                  <button
                    className="merge-btn reverse"
                    onClick={() => handleMergeToOriginal(index)}
                  >
                    Use Modified ({selectedLineRange.end - selectedLineRange.start + 1} lines) →
                  </button>
                </div>
              )}
              {isSelected && !selectedLineRange && isChangeable && (
                <div className="merge-controls">
                  <button
                    className="merge-btn"
                    onClick={() => handleMergeToModified(index)}
                    disabled={!line.original_content}
                  >
                    ← Use Original
                  </button>
                  <span>Merge</span>
                  <button
                    className="merge-btn reverse"
                    onClick={() => handleMergeToOriginal(index)}
                    disabled={!line.modified_content}
                  >
                    Use Modified →
                  </button>
                </div>
              )}
              <div
                className={`diff-line-split diff-${line.type} ${
                  isChangeable ? 'clickable' : ''
                } ${isSelected ? 'selected' : ''}`}
                onClick={() => isChangeable && handleLineClick(index, line)}
              >
                <div className="diff-side original">
                  <span className="line-number">{line.original_line || ''}</span>
                  <span className="line-content">
                    {line.type === 'modify' && line.word_diffs ? (
                      renderWordDiff(
                        line.word_diffs.filter((w) => w.type !== 'insert')
                      )
                    ) : (
                      line.original_content || ''
                    )}
                  </span>
                </div>
                <div className="diff-side modified">
                  <span className="line-number">{line.modified_line || ''}</span>
                  <span className="line-content">
                    {line.type === 'modify' && line.word_diffs ? (
                      renderWordDiff(
                        line.word_diffs.filter((w) => w.type !== 'delete')
                      )
                    ) : (
                      line.modified_content || ''
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderUnifiedView = () => {
    return (
      <div className="diff-content unified-view">
        {diff.map((line, index) => {
          if (line.type === 'context') {
            return (
              <div key={index} className="diff-line-unified diff-context">
                <span className="line-number">{line.original_line}</span>
                <span className="line-number">{line.modified_line}</span>
                <span className="line-content">{line.original_content}</span>
              </div>
            )
          } else if (line.type === 'remove') {
            return (
              <div key={index} className="diff-line-unified diff-remove">
                <span className="line-number">{line.original_line}</span>
                <span className="line-number"></span>
                <span className="line-content">- {line.original_content}</span>
              </div>
            )
          } else if (line.type === 'add') {
            return (
              <div key={index} className="diff-line-unified diff-add">
                <span className="line-number"></span>
                <span className="line-number">{line.modified_line}</span>
                <span className="line-content">+ {line.modified_content}</span>
              </div>
            )
          } else if (line.type === 'modify') {
            return (
              <div key={`modify-${index}`}>
                <div className="diff-line-unified diff-remove">
                  <span className="line-number">{line.original_line}</span>
                  <span className="line-number"></span>
                  <span className="line-content">
                    -{' '}
                    {line.word_diffs
                      ? renderWordDiff(
                          line.word_diffs.filter((w) => w.type !== 'insert')
                        )
                      : line.original_content}
                  </span>
                </div>
                <div className="diff-line-unified diff-add">
                  <span className="line-number"></span>
                  <span className="line-number">{line.modified_line}</span>
                  <span className="line-content">
                    +{' '}
                    {line.word_diffs
                      ? renderWordDiff(
                          line.word_diffs.filter((w) => w.type !== 'delete')
                        )
                      : line.modified_content}
                  </span>
                </div>
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  const renderDiffView = () => {
    if (!showDiff) return null

    return (
      <div className="diff-container">
        <div className="diff-header">
          <h2>Difference View</h2>
          <div className="diff-controls">
            <div className="history-controls">
              <button
                className="history-btn"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
              >
                <UndoIcon />
              </button>
              <button
                className="history-btn"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y)"
              >
                <RedoIcon />
              </button>
            </div>
            <div className="view-toggle">
              <button
                className={viewMode === 'split' ? 'active' : ''}
                onClick={() => setViewMode('split')}
              >
                Split
              </button>
              <button
                className={viewMode === 'unified' ? 'active' : ''}
                onClick={() => setViewMode('unified')}
              >
                Unified
              </button>
            </div>
            <button onClick={() => setShowDiff(false)} className="close-btn">
              Close
            </button>
          </div>
        </div>
        {viewMode === 'split' ? renderSplitView() : renderUnifiedView()}
        {toast.visible && <div className="toast">{toast.message}</div>}
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-container">
            <img src="/logo.svg" alt="DiffInspector Logo" className="app-logo" />
          </div>
          <div className="header-text">
            <h1>DiffInspector</h1>
            <p>Compare text, code, or prompts side by side</p>
          </div>
        </div>
      </header>

      {!showDiff ? (
        <div className="editor-container">
          <div className="editor-panel">
            <h2>Original Text</h2>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="Paste your original text, code, or prompt here..."
              spellCheck={false}
            />
          </div>

          <div className="editor-panel">
            <h2>Modified Text</h2>
            <textarea
              value={modified}
              onChange={(e) => setModified(e.target.value)}
              placeholder="Paste your modified text, code, or prompt here..."
              spellCheck={false}
            />
          </div>
        </div>
      ) : (
        renderDiffView()
      )}

      {!showDiff && (
        <div className="action-container">
          <button
            onClick={handleCheckDifference}
            disabled={loading || !original || !modified}
            className="check-btn"
          >
            {loading ? 'Calculating...' : ' Difference'}
          </button>
        </div>
      )}
    </div>
  )
}

export default App
