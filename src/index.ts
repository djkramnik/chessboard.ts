// consider debounce?

const chessts = (function chessTs() {
  /**
   * DANGER GLOBAL STATE.  DANGER
   */

  // stuff in here involves direct manipulation the dom of the chessboard, or the global state, in an EFFICIENT way

  type UiState = {
    pieces: HTMLElement[]
    flipped: boolean
    boardEl: HTMLElement
    player: Player | null
    moving: Square | null // make this a piece? 
    getAsset: ((p: Piece) => string)
    onMove: ((f: Square, t: Square) => void) | null
    selectPiece: ((s: Square) => void) | null
    onHover: ((f: Square, t: Square) => void) | null
    onDrag: {
      start: (s: Square) => void
      end: (f: Square, t: Square | null) => void
    } | null
    onClick: ((s: Square) => void) | null
  }
  
  let globalState: UiState = {
    pieces: [],
    flipped: false,
    boardEl: document.createElement('div'),
    player: 0,
    moving: null,
    getAsset: () => 'placeholder',
    onMove: null,
    selectPiece: null,
    onHover: null,
    onDrag: null,
    onClick: null,
  }

  let animateQueue: Promise<void> = Promise.resolve() // orders to animate something on the board get attached to this promise

  function animatePiece(from: Square, to: Square) {
    animateQueue = animateQueue.then(() => {
      return new Promise(resolve => {
        const target = findPiece(from)
        if (!target) {
          console.warn('Cannot find piece on', from)
          resolve()
          return
        }
        target.style.transition = '240ms transform'
        const [translateX, translateY] = translateSquares(from, to, globalState.flipped)
        target.style.transform = `translate(${translateX}%,${translateY}%)`
        target.addEventListener('transitionend', function onTransitionEnd() {
          target.style.transition = 'initial'
          target.style.transform = 'initial'
          movePiece(from, to)
          target.removeEventListener('transitionend', onTransitionEnd)
          resolve()
        })
      })
    })
    return animateQueue
  }

  function removePiece(s: Square) {
    const piece = findPiece(s)
    if (!piece) {
      console.log('cannot find piece to remove?')
      return
    }
    globalState.pieces.splice(globalState.pieces.findIndex(function (el) { return el === piece; }), 1);
    piece.remove()
  }

  function movePiece(from: Square, to: Square) {
    if (from === to) {
      return
    }
    const target = findPiece(from)
    if (!target) {
      console.warn('Cannot find piece on', from)
      return
    }
    const maybeCapture = findPiece(to)

    const { top, left } = squareToPos(to, globalState.flipped)

    target.style.top = top
    target.style.left = left
    target.setAttribute('data-square', to)
    if (maybeCapture) {
      // shit blows up without this splice and idkw
      globalState.pieces.splice(globalState.pieces.findIndex(el => el === maybeCapture), 1)
      maybeCapture.remove() // goodbye jack
    }
  }

  function placePiece({
    piece,
    square,
    player,
  }: {
    piece: Piece
    square: Square
    player: Player | null
  }) {
    const pieceUi = initPiece({
      type: piece,
      square: square as Square,
      flipped: globalState.flipped,
      getAsset: globalState.getAsset!,
      disabled: player !== null
        ? toPlayer(piece) !== player
        : false,
      onMove: globalState.onMove!,
    })
    globalState.pieces.push(pieceUi)
    globalState.boardEl.appendChild(pieceUi)
  }

  function freeze(player: Player | null) {
    for(const piece of globalState.pieces) {
      if (player === null) {
        piece.setAttribute('data-disabled', 'true')
        continue
      }
      const pieceColor = toPlayer(piece.getAttribute('data-piece-type')! as Piece)
      if (player === pieceColor) {
        piece.setAttribute('data-disabled', 'true')
        continue
      }
      piece.setAttribute('data-disabled', '')
    }
  }

  function unfreeze(player: Player | null) {
    for(const piece of globalState.pieces) {
      if (player === null) {
        piece.setAttribute('data-disabled', 'false')
        continue
      }
      const pieceColor = toPlayer(piece.getAttribute('data-piece-type')! as Piece)
      if (player === pieceColor) {
        piece.setAttribute('data-disabled', 'false')
        continue
      }
      piece.setAttribute('data-disabled', 'true')
    }
  }

  function decorate(s: Square, decoration: HTMLElement, withPointer: boolean) {

    // square to position... put on board... 
    const decorationParent = 
    document.getElementById('data-decoration_' + s) ??
    createDom('div', {
      position: 'absolute',
      width: '12.5%',
      height: '12.5%',
      display: 'flex',
      ...(squareToPos(s, globalState.flipped)),
      ...(withPointer
        ? {
          cursor: 'pointer'
        }
        : {}
      )
    }, {
      'id': 'data-decoration_' + s
    })
    decorationParent.classList.add('chessboard_decoration')
    decorationParent.appendChild(decoration)
    globalState.boardEl.appendChild(decorationParent)
  }

  function removeAllDecorations() {
    globalState.boardEl.querySelectorAll('.chessboard_decoration').forEach(el => el.remove())
  }

  function removeDecoration(s: Square) {
    const container = document.getElementById('data-decoration_' + s)
    if (!container) {
      return
    }
    container.innerHTML = ''
  }
  function removeOneDecoration(s: Square, selector: string) {
    const container = document.getElementById('data-decoration_' + s)
    if (!container) {
      return
    }
    container.querySelector(selector)?.remove()
  }

  function findPiece(s: Square) {
    return globalState.pieces.find(el => el.getAttribute('data-square') === s)
  }

  /** DANGER.  REACT SUX.  DANGER */
  let container: HTMLElement | null = null

  // reset the board after the initialization
  function resetChessboard({
    state,
    flipped,
  }: {
    state: GameState
    flipped?: boolean
  }) {

    // should not happen (reset during user dragging a piece) but just in case..
    globalState.moving = null
    document.getElementById('draggablePiece')?.remove()

    // remove existing pieces off the board
    globalState.pieces.forEach(p => {
      p.remove()
    })
    globalState.pieces = []

    globalState.flipped = flipped === true
    const pieces = Object.entries(state.position)
    for(const [square, piece] of pieces) {
      const pieceUi = initPiece({
        type: piece,
        square: square as Square,
        flipped,
        getAsset: globalState.getAsset,
        disabled: state.player !== null
          ? toPlayer(piece) !== state.player
          : false,
        onMove: globalState.onMove ?? undefined,
        selectPiece: globalState.selectPiece ?? undefined,
      })
      globalState.pieces.push(pieceUi)
      globalState.boardEl.appendChild(pieceUi)
    }
  }

  function initChessboard({
    el,
    background,
    state,
    getAsset,
    flipped,
    onMove = movePiece,
    selectPiece,
    onHover,
    onDrag,
    onClick,
  }: {
    el: HTMLElement
    background: string
    state: GameState
    flipped?: boolean
    getAsset: (type: Piece) => string
    onMove?: (f: Square, t: Square) => void
    selectPiece?: (s: Square) => void
    onHover?: (f: Square, t: Square) => void
    onDrag?: { start: (s: Square) => void, end: (s: Square, t: Square | null) => void }
    onClick?: (s: Square) => void
  }) {
    // prevent > 1 initialization
    if (container === el) {
      return
    }
    container = el
    globalState.boardEl = el
    globalState.flipped = flipped === true
    globalState.getAsset = getAsset
    globalState.onMove = onMove
    globalState.onHover = onHover ?? null
    globalState.selectPiece = selectPiece ?? null
    globalState.onDrag = onDrag ?? null
    globalState.onClick = onClick ?? null
    el.style.background = `url(${background})`
    el.style.position = 'relative'

    const pieces = Object.entries(state.position)
    for(const [square, piece] of pieces) {
      const pieceUi = initPiece({
        type: piece,
        square: square as Square,
        flipped,
        getAsset,
        disabled: state.player !== null
          ? toPlayer(piece) !== state.player
          : false,
        onMove,
        selectPiece,
      })
      globalState.pieces.push(pieceUi)
      el.appendChild(pieceUi)
    }
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.hasAttribute('data-square')) {
        return
      }
      const { width, x, y } = globalState.boardEl.getBoundingClientRect()
      const square = posToSquare({ 
        size: width,
        rx: e.clientX - x, ry: e.clientY - y, flipped: globalState.flipped
      })
      if (square) {
        globalState.onClick?.(square)
      }
    })
  }

  /**
   * UTILS
   */
  type BoardFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
  type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  type Square = `${BoardFile}${Rank}`;
  type Player = | 0 | 1 // white is 0
  type GameState = {
    position: Record<Square, Piece>;
    castlew: 'K' | 'Q' | 'KQ' | '';
    castleb: 'k' | 'q' | 'kq' | '';
    player: Player;
    enpassant: number | null;
    halfclock: number;
    fullMove: number;
    fen: string;
  }

  const squaresArr: Square[] = [
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
  ]
  
  // fen order
  const squares = squaresArr.reduce((acc, square, index) => {
    return {
      ...acc,
      [square]: index,
    }
  }, {} as Record<Square, number>)

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]

  const toPlayer = (p: Piece) => {
    if (/^[pnbrkq]$/.test(p)) {
      return 1
    }
    return 0
  }

  function translateSquares(from: Square, to: Square, flipped?: boolean) {
    const translateX = (files.indexOf(to[0]) - files.indexOf(from[0])) * 100 * (flipped ? -1 : 1)
    const translateY = (Number(to[1]) - Number(from[1])) * 100 * (flipped ? 1 : -1)
    return [translateX, translateY]
  }

  const expandEmptySquares = (n: number): string => {
    return Array(n).fill('0').join('')
  }
  
  const parseBoardRank = (s: Piece[]): string => {
    return s.join('').replace(/0+/g, match => String(match.length))
  }
  
  const parseFenRank = (s: string): string[] => {
    return s.replace(/([0-8])/g, (match) => {
      return expandEmptySquares(Number(match))
    }).split('')
  }

  const squareToPos = (square: Square, flipped?: boolean) => {
    const [file, rank] = square.split("");
    const adjustedFiles = flipped ? files.slice(0).reverse() : files.slice(0);
    const adjustedRank = flipped ? Number(rank) - 1 : 8 - Number(rank);
    return {
      left: Math.max(0, adjustedFiles.indexOf(file)) * 12.5 + "%",
      top: adjustedRank * 12.5 + "%",
    };
  };

  const posToSquare = ({
    rx,
    ry,
    size,
    flipped,
  }: {
    rx: number;
    ry: number;
    size: number;
    flipped?: boolean;
  }): Square | null => {
    if (rx < 0 || ry < 0 || rx > size || ry > size) {
      return null;
    }
    const eighth = size / 8;
    const fromTop = Math.floor(ry / eighth);
    const fromLeft = Math.floor(rx / eighth);
    const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = flipped
      ? ["h", "g", "f", "e", "d", "c", "b", "a"]
      : ["a", "b", "c", "d", "e", "f", "g", "h"];

    if (files[fromLeft] === undefined || ranks[fromTop] === undefined) {
      return null;
    }
    return `${files[fromLeft]}${ranks[fromTop]}` as Square;
  };

  function createDom(
    tagName: keyof HTMLElementTagNameMap,
    style: Record<string, string> = {},
    attributes: Record<string, any> = {}
  ) {
    const fragment = document.createElement(tagName)
    const styles = Object.entries(style)
    for(const [key, value] of styles) {
      // @ts-ignore
      fragment.style[key] = value
    }
    const attrs = Object.entries(attributes)
    for(const [key, value] of attrs) {
      fragment.setAttribute(key, value)
    }
    return fragment
  }

  const fenToState = (fen: string): GameState => {
    const [
      pieces,
      player,
      castling,
      enpassant,
      halfclock,
      fullMove,
    ] = fen.split(' ')
  
    const position = 
      pieces
      .split('/')
      .reduce((acc: string[], s) => {
        return acc.concat(parseFenRank(s))
      }, [])
      .reduce((acc, p, index) => {
        return {
          ...acc,
          ...(p !== '0'
            ? {
              [(squaresArr[index] as Square)]: p
            }
            : undefined
          )
        }
      }, {} as Record<Square, Piece>)

    return {
      position,
      player: player === 'w' ? 0 : 1,
      castlew: (castling.replace(/[^KQ]/g, '')) as GameState['castlew'],
      castleb: (castling.replace(/[^kq]/g, '')) as GameState['castleb'],
      enpassant: enpassant === '-'
        ? null
        : (squares[enpassant as Square] as number ?? null),
      halfclock: Number(halfclock),
      fullMove: Number(fullMove),
      fen,
    }
  }

  /**
   * CHESS PIECE
   */

  type Piece =
    | "p" // lowercase = black
    | "n"
    | "b"
    | "r"
    | "q"
    | "k"
    | "P" // uppercase = white
    | "N"
    | "B"
    | "R"
    | "Q"
    | "K";

  type PieceProps = {
    type: Piece;
    square: Square;
    flipped?: boolean
    disabled?: boolean
    getAsset: (type: Piece) => string
    onMove?: (f: Square, t: Square) => void
    selectPiece?: (s: Square) => void
    onDrag?: {
      start: (s: Square) => void,
      end: (s: Square) => void,
    }
  };

  function initPiece({
    type,
    square,
    flipped,
    disabled,
    getAsset,
    onMove,
    selectPiece,
  }: PieceProps) {
    const containerUi = createDom('div', {
      position: 'absolute',
      width: '12.5%',
      height: '12.5%',
      zIndex: '1',
      ...squareToPos(square, flipped),
    }, { 
      draggable: false,
      'data-disabled': disabled,
      'data-square': square,
      'data-piece-type': type,
    })
    const imgUi = createDom('img', {
      width: '100%',
      cursor: disabled ? 'auto': 'pointer',
    }, { draggable: false, src: getAsset(type) })
    containerUi.appendChild(imgUi)
    containerUi.addEventListener('mousedown', function handleMouseDown(e) {
      if (containerUi.getAttribute('data-disabled') === 'true') {
        return
      }
      globalState.moving = containerUi.getAttribute('data-square') as Square
      createDraggablePiece(e as MouseEvent, containerUi as HTMLDivElement, onMove, globalState.onDrag?.end, selectPiece)
      globalState.onDrag?.start(containerUi.getAttribute('data-square') as Square)
    })
    return containerUi
  }

  function createDraggablePiece(
    e: MouseEvent,
    el: HTMLDivElement,
    onMove?: (f: Square, t: Square) => void,
    onDragEnd?: (f: Square, t: Square | null) => void,
    selectPiece?: (s: Square) => void,
  ) {
    if (document.getElementById('draggablePiece') !== null) {
      return
    }
    const { width, height } = el.getBoundingClientRect()
    const draggablePiece = el.cloneNode(true /** clone children */) as HTMLDivElement
    draggablePiece.setAttribute('data-square', '')
    draggablePiece.setAttribute('id', 'draggablePiece')
    draggablePiece.style.backgroundColor = 'transparent'
    draggablePiece.style.width = width + 'px'
    draggablePiece.style.height = height + 'px'
    draggablePiece.style.pointerEvents = 'none'
    draggablePiece.style.userSelect = 'none';
    document.body.appendChild(draggablePiece)
    handleMouseMove(e)
    el.style.opacity = '0.5'
    // create a window event handler for mouse move
    window.addEventListener('mousemove', handleMouseMove)

    window.addEventListener('mouseup', function handleMouseUp(e: MouseEvent) {
      const draggablePiece = document.getElementById('draggablePiece')
      const { width, x, y } = globalState.boardEl.getBoundingClientRect()
      const toSquare = posToSquare({ 
        size: width,
        rx: e.clientX - x, ry: e.clientY - y, flipped: globalState.flipped
      })
      if (draggablePiece) {
        draggablePiece.remove()
        globalState.moving = null
        onDragEnd?.(el.getAttribute('data-square') as Square, toSquare)
      }
      if (onMove) {
        const fromSquare = el.getAttribute('data-square')

        if (fromSquare && toSquare) {
          if (fromSquare !== toSquare) {
            onMove(fromSquare as Square, toSquare)
          }
        }
      }
      if (selectPiece) {
        const fromSquare = el.getAttribute('data-square')

        if (fromSquare && toSquare) {
          if (fromSquare === toSquare) {
            selectPiece(fromSquare as Square)
          }
        }
      }
      el.style.opacity = 'initial'
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    })
  }

  function handleMouseMove(e: MouseEvent) {
    const draggablePiece = document.getElementById('draggablePiece')
    if (!draggablePiece || !globalState.moving) {
      return
    }
    const { x, y, width } = globalState.boardEl.getBoundingClientRect()
    const hoverSquare = posToSquare({ 
      rx: e.clientX - x,
      ry: e.clientY - y,
      size: width,
      flipped: globalState.flipped === true,
    })
    if (hoverSquare) {
      globalState.onHover?.(globalState.moving, hoverSquare)
    } 
    draggablePiece.style.top = (e.pageY - (draggablePiece.clientHeight / 2)) + 'px'
    draggablePiece.style.left = (e.pageX - (draggablePiece.clientWidth / 2)) + 'px' 
  }

  return {
    initChessboard,
    resetChessboard,
    fenToState,
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    animatePiece,
    movePiece,
    removePiece,
    placePiece,
    freeze,
    unfreeze,
    state: globalState,
    posToSquare,
    decorate,
    removeDecoration,
    removeOneDecoration,
    removeAllDecorations,
  };
})();
