const chessts = (function chessTs() {
  function initChessboard({
    el,
    background,
    position,
    flipped,
  }: {
    el: HTMLElement;
    background: string;
    position: Record<Square, Piece>
    flipped?: boolean
  }) {
    el.style.background = `url(${background})`;
    const pieces = Object.entries(position)
    for(const [square, piece] of pieces) {
      el.appendChild(
        initPiece({
          type: piece,
          square: square as Square,
          flipped,
        })
      )
    }
  }

  /**
   * UTILS
   */
  type BoardFile = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
  type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  type Square = `${BoardFile}${Rank}`;

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
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
  };

  function initPiece({
    type,
    square,
    bgc = 'transparent',
    flipped,
    disabled,
  }: PieceProps) {
    const containerUi = createDom('div', {
      position: 'absolute',
      width: '12.5%',
      height: '12.5%',
      backgroundColor: bgc,
      ...squareToPos(square, flipped),
    }, { draggable: false, id: `${square}_${type}` })
    const imgUi = createDom('img', {
      width: '100%',
      cursor: disabled ? 'auto': 'pointer',
    }, { draggable: false })
    containerUi.appendChild(imgUi)
    
    return containerUi
  }

  return {
    initChessboard,
  };
})();
