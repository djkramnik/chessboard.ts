const chessts = (function chessTs() {
  /**
   * DANGER GLOBAL STATE.  DANGER
   */

  // stuff in here involves direct manipulation the dom of the chessboard, or the global state, in an EFFICIENT way
  // a react component can interact with these via a pubsub system

  type UiState = {
    pieces: HTMLElement[]
    flipped: boolean
    boardEl: HTMLElement
  }
  let globalState: UiState = {
    pieces: [],
    flipped: false,
    boardEl: document.createElement('div')
  }

  let animateQueue: Promise<void> = Promise.resolve() // orders to animate something on the board get attached to this promise

  function animatePiece(from: Square, to: Square) {
    animateQueue = animateQueue.then(() => {
      return new Promise(resolve => {
        const target = globalState.pieces.find(el => el.getAttribute('data-square') === from)
        if (!target) {
          console.warn('Cannot find piece on', from)
          return
        }
        target.style.transition = '240ms transform'
        const [translateX, translateY] = translateSquares(from, to, globalState.flipped)
        target.style.transform = `translate(${translateX}%,${translateY}%)`
        target.addEventListener('transitionend', () => {
          target.style.transition = 'initial'
          target.style.transform = 'initial'
          movePiece(from, to)
          resolve()
        })
      })
    })
  }

  function movePiece(from: Square, to: Square) {
    if (from === to) {
      return
    }
    const target = globalState.pieces.find(el => el.getAttribute('data-square') === from)
    if (!target) {
      console.warn('Cannot find piece on', from)
      return
    }
    const maybeCapture = globalState.pieces.find(el => el.getAttribute('data-square') === to)

    const { top, left } = squareToPos(to, globalState.flipped)

    target.style.top = top
    target.style.left = left
    target.setAttribute('data-square', to)
    if (maybeCapture) {
      globalState.pieces.splice(globalState.pieces.findIndex(el => el === maybeCapture), 1)
      maybeCapture.remove() // goodbye jack
    }
  }

  function restorePiece(square: Square, type: Piece) {

  }

  /** DANGER.  REACT SUX.  DANGER */

  function initChessboard({
    el,
    background,
    state,
    getAsset,
    flipped,
    player,
    onMove = movePiece,
  }: {
    el: HTMLElement
    background: string
    state: GameState
    position: Record<Square, Piece>
    flipped?: boolean
    getAsset: (type: Piece) => string
    player: Player | null,
    onMove?: (f: Square, t: Square) => void 
  }) {
    globalState.boardEl = el
    globalState.flipped = flipped === true
    el.style.background = `url(${background})`
    el.style.position = 'relative'
    const pieces = Object.entries(state.position)
    for(const [square, piece] of pieces) {
      const pieceUi = initPiece({
        type: piece,
        square: square as Square,
        flipped,
        getAsset,
        disabled: player !== null
          ? toPlayer(piece) !== player
          : false,
        onMove,
      })
      globalState.pieces.push(pieceUi)
      el.appendChild(pieceUi)
    }
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
    bgc?: string
    getAsset: (type: Piece) => string
    onMove?: (f: Square, t: Square) => void // might have to move this to global so outside can effect it more easily
  };

  function initPiece({
    type,
    square,
    bgc = 'transparent',
    flipped,
    disabled,
    getAsset,
    onMove,
  }: PieceProps) {
    const containerUi = createDom('div', {
      position: 'absolute',
      width: '12.5%',
      height: '12.5%',
      backgroundColor: bgc,
      ...squareToPos(square, flipped),
    }, { 
      draggable: false,
      'data-disabled': disabled,
      'data-square': square
    })
    const imgUi = createDom('img', {
      width: '100%',
      cursor: disabled ? 'auto': 'pointer',
    }, { draggable: false, src: getAsset(type)})
    containerUi.appendChild(imgUi)
    containerUi.addEventListener('mousedown', function handleMouseDown() {
      if (containerUi.getAttribute('data-disabled') === 'true') {
        return
      }
      createDraggablePiece(containerUi as HTMLDivElement, onMove)
    })
    return containerUi
  }

  function createDraggablePiece(el: HTMLDivElement, onMove?: (f: Square, t: Square) => void) {
    if (document.getElementById('draggablePiece') !== null) {
      return
    }
    const { top, left, width, height } = el.getBoundingClientRect()
    const draggablePiece = el.cloneNode(true /** clone children */) as HTMLDivElement
    draggablePiece.setAttribute('data-square', '')
    draggablePiece.setAttribute('id', 'draggablePiece')
    draggablePiece.style.backgroundColor = 'transparent'
    draggablePiece.style.width = width + 'px'
    draggablePiece.style.height = height + 'px'
    draggablePiece.style.top = (top + 5) + 'px'
    draggablePiece.style.left = left + 'px'
    draggablePiece.style.pointerEvents = 'none'
    document.body.appendChild(draggablePiece)
    el.style.opacity = '0.5'
    // create a window event handler for mouse move
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', function handleMouseUp(e: MouseEvent) {
      const draggablePiece = document.getElementById('draggablePiece')

      if (draggablePiece) {
        draggablePiece.remove()
      }
      if (onMove) {
        const { width, x, y } = globalState.boardEl.getBoundingClientRect()
        const toSquare = posToSquare({ size: width, rx: e.clientX - x, ry: e.pageY - y, flipped: globalState.flipped})
        const fromSquare = el.getAttribute('data-square')
        if (fromSquare && toSquare) {
          onMove(fromSquare as Square, toSquare)
        }
      }
      el.style.opacity = 'initial'
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    })
  }

  function handleMouseMove(e: MouseEvent) {
    const draggablePiece = document.getElementById('draggablePiece')
    if (!draggablePiece) {
      return
    }
    draggablePiece.style.top = (e.clientY - (draggablePiece.clientHeight / 2)) + 'px'
    draggablePiece.style.left = (e.clientX - (draggablePiece.clientWidth / 2)) + 'px' 
  }

  return {
    initChessboard,
    fenToState,
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    animatePiece,
    movePiece,
  };
})();
