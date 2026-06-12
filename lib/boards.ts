import { useState, useEffect, useCallback } from 'react'
import type { Board, SavedItem } from '@/lib/types'

const STORAGE_KEY = 'dropfeed_boards_v1'
const USER_ID = 'local' // placeholder until auth

interface BoardsStore {
  boards: Board[]
  items: SavedItem[]
  lastBoardId: string | null
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function loadStore(): BoardsStore {
  if (typeof window === 'undefined') return { boards: [], items: [], lastBoardId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as BoardsStore
  } catch {}
  return { boards: [], items: [], lastBoardId: null }
}

function persistStore(s: BoardsStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

export function useBoards() {
  const [store, setStore] = useState<BoardsStore>(loadStore)

  useEffect(() => {
    persistStore(store)
  }, [store])

  /** Create a new board and set it as last-used. Returns the new Board. */
  const createBoard = useCallback((name: string): Board => {
    const board: Board = {
      id: uid(),
      userId: USER_ID,
      name: name.trim() || 'Nowy board',
      createdAt: new Date().toISOString(),
    }
    setStore((s) => ({ ...s, boards: [...s.boards, board], lastBoardId: board.id }))
    return board
  }, [])

  /** Save an ad to a specific board. Returns the SavedItem. */
  const saveToBoard = useCallback((boardId: string, adId: string): SavedItem => {
    const item: SavedItem = {
      id: uid(),
      boardId,
      adId,
      savedAt: new Date().toISOString(),
    }
    setStore((s) => ({ ...s, items: [...s.items, item], lastBoardId: boardId }))
    return item
  }, [])

  /**
   * Save to last-used board.
   * If no boards exist, creates a default "Do przetestowania" board.
   * Returns the board name (for feedback UI).
   * Reads from current `store` snapshot (updated in render), so the return
   * value is always correct at call time.
   */
  const saveToLastBoard = useCallback(
    (adId: string): string => {
      const lastBoard = store.lastBoardId
        ? store.boards.find((b) => b.id === store.lastBoardId)
        : undefined

      // Already saved to this board — skip duplicate, still return name
      if (lastBoard && store.items.some((i) => i.adId === adId && i.boardId === lastBoard.id)) {
        return lastBoard.name
      }

      let board = lastBoard
      let updatedBoards = store.boards

      if (!board) {
        board = {
          id: uid(),
          userId: USER_ID,
          name: 'Do przetestowania',
          createdAt: new Date().toISOString(),
        }
        updatedBoards = [...store.boards, board]
      }

      const boardName = board.name
      const item: SavedItem = {
        id: uid(),
        boardId: board.id,
        adId,
        savedAt: new Date().toISOString(),
      }
      setStore({
        boards: updatedBoards,
        items: [...store.items, item],
        lastBoardId: board.id,
      })
      return boardName
    },
    [store],
  )

  const getBoardItems = useCallback(
    (boardId: string) => store.items.filter((i) => i.boardId === boardId),
    [store.items],
  )

  const getBoardItemCount = useCallback(
    (boardId: string) => store.items.filter((i) => i.boardId === boardId).length,
    [store.items],
  )

  const isAlreadySaved = useCallback(
    (adId: string) => store.items.some((i) => i.adId === adId),
    [store.items],
  )

  const getLastBoardName = useCallback((): string => {
    if (!store.lastBoardId) return 'Do przetestowania'
    return store.boards.find((b) => b.id === store.lastBoardId)?.name ?? 'Do przetestowania'
  }, [store])

  return {
    boards: store.boards,
    items: store.items,
    lastBoardId: store.lastBoardId,
    createBoard,
    saveToBoard,
    saveToLastBoard,
    getBoardItems,
    getBoardItemCount,
    isAlreadySaved,
    getLastBoardName,
  }
}
