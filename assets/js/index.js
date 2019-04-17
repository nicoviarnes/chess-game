$(document).ready(function() {
  // Initialize Firebase
  const config = {
    apiKey: "AIzaSyCavSUHbCx7Dpc3jEKeOHfROmqh-dpRjnQ",
    authDomain: "chess-board-18176.firebaseapp.com",
    databaseURL: "https://chess-board-18176.firebaseio.com",
    projectId: "chess-board-18176",
    storageBucket: "",
    messagingSenderId: "8808173500"
  };
  firebase.initializeApp(config);
  const database = firebase.database();
  const connectionsRef = database.ref("/connections");
  const connectedRef = database.ref(".info/connected");
  const chessboardRef = database.ref("/chessboard");
  const historyRef = database.ref("/history");
  const currentGame = database.ref("/currentGame");
  const lastMoveRef = database.ref("/lastMove");
  const piecesRef = database.ref("/pieces");
  const undoRef = database.ref("/undo");
  let myClientTag = "";
  let players = [];
  let myTurn;
  let myColor;
  let opponentColor;
  let history;
  connectedRef.on("value", function(snapshot) {
    // If they are connected..
    if (snapshot.val()) {
      // Add user to the connections list.
      const con = connectionsRef.push(true);
      myClientTag = con.key;
      // Remove user from the connection list when they disconnect.
      con.onDisconnect().remove();
    }
  });
  connectionsRef.on("value", function(snapshot) {
    const connectionArr = Object.keys(JSON.parse(JSON.stringify(snapshot)));
    $("#visitors").text(
      `${connectionArr.length} user(s) currently on this page`
    );
    if (connectionArr.length <= 2) {
      players = connectionArr;
      if (myClientTag === players[0]) {
        $(".new-game-btn").attr("id", "new-game");
        myColor = "white";
        opponentColor = "black";
        myTurn = true;
      } else if (myClientTag === players[1]) {
        $(".new-game-btn").attr("id", "new-game");
        myColor = "black";
        opponentColor = "white";
        myTurn = false;
      } else if (myTurn === true) {
        $("#whose-turn").text(`It is ${myColor}'s turn.`);
      } else {
        $("whose-turn").text(`It is ${opponentColor}'s turn.`);
      }
    } else {
      $("#whose-turn").text(`Waiting for a spot to open.`);
      $(".new-game-btn").attr("id", "");
    }

    $("#my-color").text(
      `My Color: ${myColor.charAt(0).toUpperCase() + myColor.slice(1)}`
    );
    console.log("players", players);
    console.log("myClientTag", myClientTag);
    console.log("myColor: ", myColor);
    console.log("opponent color: ", opponentColor);
  });
  chessboardRef.on("value", function(snapshot) {
    chessboard = snapshot.val();
    Object.keys(snapshot.val()).forEach(letter => {
      for (let y = 0; y < snapshot.val()[letter].length; y++) {
        $(`#${letter}${y + 1}`)
          .removeClass("w b piece")
          .attr("data-occupying", "")
          .empty();
        if (snapshot.val()[letter][y][0] != "e") {
          $(`#${letter}${y + 1}`)
            .addClass(`${snapshot.val()[letter][y][0]} piece`)
            .attr("data-occupying", snapshot.val()[letter][y])
            .append(
              $("<img>").attr("src", PIECES[snapshot.val()[letter][y]].img)
            );
        }
      }
    });
    if (JSON.stringify(snapshot.val()) === JSON.stringify(chessboardStart)) {
      $(".cover").removeClass("active");
      $(".winner")
        .removeClass("active")
        .empty();
    }
  });
  lastMoveRef.on("value", function(snapshot) {
    $(".from").removeClass("from");
    $(".to").removeClass("to");
    let from = snapshot.val()["from"];
    let to = snapshot.val()["to"];
    if (from && to) {
      $(`#${from}`).addClass("from");
      $(`#${to}`).addClass("to");
    }
  });
  undoRef.on("value", function(snapshot) {
    if (snapshot.val().white && snapshot.val().black) {
      undoRef.set({ white: false, black: false });
      currentGame.set({ whoseTurn: history.whoseTurn });
      piecesRef.set(history.pieces);
      chessboardRef.set(history.lastBoard);
      $(".from").removeClass("from");
      $(".to").removeClass("to");
    } else if (snapshot.val().white && myColor === "black") {
      swal("White has suggested an undo! Press undo to comply.");
    } else if (snapshot.val().black && myColor === "white") {
      swal("Black has suggested an undo! Press undo to comply.");
    }
  });
  historyRef.on("value", function(snapshot){
    history = snapshot.val();
    console.log(history);
  });
  currentGame.on("value", function(snapshot) {
    if (snapshot.val().whoseTurn === myColor) {
      if (amIInCheck()) {
        swal("You are in check!", "Your next move may be fatal.", "warning");
      } else {
        swal({ title: "It is your turn. ", buttons: { accept: "Okay" } });
      }
      myTurn = true;
      $("#whose-turn").text(`It is ${snapshot.val().whoseTurn}'s turn.`);
    } else if (snapshot.val().whoseTurn === opponentColor) {
      myTurn = false;
      $("#whose-turn").text(`It is ${snapshot.val().whoseTurn}'s turn.`);
    } else if (snapshot.val().whoseTurn === `${myColor}wins`) {
      $(".cover").addClass("active");
      $(".winner")
        .addClass("active")
        .text("You won! Press New Game to play again.");
      $("#whose-turn").text(`Game Over`);
    } else if (snapshot.val().whoseTurn === `${opponentColor}wins`) {
      $(".cover").addClass("active");
      $(".winner")
        .addClass("active")
        .text("You lost. Press New Game to play again.");
      $("#whose-turn").text(`Game Over`);
    }
  });
  piecesRef.on("value", function(snapshot) {
    PIECES = snapshot.val();
  });
  const chessboardStart = {
    a: ["wr1", "wp1", "empty", "empty", "empty", "empty", "bp1", "br1"],
    b: ["wk1", "wp2", "empty", "empty", "empty", "empty", "bp2", "bk1"],
    c: ["wb1", "wp3", "empty", "empty", "empty", "empty", "bp3", "bb1"],
    d: ["wq", "wp4", "empty", "empty", "empty", "empty", "bp4", "bki"],
    e: ["wki", "wp5", "empty", "empty", "empty", "empty", "bp5", "bq"],
    f: ["wb2", "wp6", "empty", "empty", "empty", "empty", "bp6", "bb2"],
    g: ["wk2", "wp7", "empty", "empty", "empty", "empty", "bp7", "bk2"],
    h: ["wr2", "wp8", "empty", "empty", "empty", "empty", "bp8", "br2"]
  };
  let chessboard = JSON.parse(JSON.stringify(chessboardStart));
  const letters = ["a", "b", "c", "d", "e", "f", "g", "h"];
  let PIECES = {
    wp1: {
      name: "wp1",
      img: "assets/images/wp.png",
      start: "a2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp2: {
      name: "wp2",
      img: "assets/images/wp.png",
      start: "b2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp3: {
      name: "wp3",
      img: "assets/images/wp.png",
      start: "c2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp4: {
      name: "wp4",
      img: "assets/images/wp.png",
      start: "d2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp5: {
      name: "wp5",
      img: "assets/images/wp.png",
      start: "e2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp6: {
      name: "wp6",
      img: "assets/images/wp.png",
      start: "f2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp7: {
      name: "wp7",
      img: "assets/images/wp.png",
      start: "g2",
      type: "pawn",
      hasBeenMoved: false
    },
    wp8: {
      name: "wp8",
      img: "assets/images/wp.png",
      start: "h2",
      type: "pawn",
      hasBeenMoved: false
    },
    bp1: {
      name: "bp1",
      img: "assets/images/bp.png",
      start: "a7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp2: {
      name: "bp2",
      img: "assets/images/bp.png",
      start: "b7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp3: {
      name: "bp3",
      img: "assets/images/bp.png",
      start: "c7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp4: {
      name: "bp4",
      img: "assets/images/bp.png",
      start: "d7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp5: {
      name: "bp5",
      img: "assets/images/bp.png",
      start: "e7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp6: {
      name: "bp6",
      img: "assets/images/bp.png",
      start: "f7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp7: {
      name: "bp7",
      img: "assets/images/bp.png",
      start: "g7",
      type: "pawn",
      hasBeenMoved: false
    },
    bp8: {
      name: "bp8",
      img: "assets/images/bp.png",
      start: "h7",
      type: "pawn",
      hasBeenMoved: false
    },
    wr1: {
      name: "wr1",
      img: "assets/images/wr.png",
      start: "a1",
      type: "rook",
      hasBeenMoved: false
    },
    wr2: {
      name: "wr2",
      img: "assets/images/wr.png",
      start: "h1",
      type: "rook",
      hasBeenMoved: false
    },
    br1: {
      name: "br1",
      img: "assets/images/br.png",
      start: "a8",
      type: "rook",
      hasBeenMoved: false
    },
    br2: {
      name: "br2",
      img: "assets/images/br.png",
      start: "h8",
      type: "rook",
      hasBeenMoved: false
    },
    wk1: {
      name: "wk1",
      img: "assets/images/wk.png",
      start: "b1",
      type: "knight"
    },
    wk2: {
      name: "wk2",
      img: "assets/images/wk.png",
      start: "g1",
      type: "knight"
    },
    bk1: {
      name: "bk1",
      img: "assets/images/bk.png",
      start: "b8",
      type: "knight"
    },
    bk2: {
      name: "bk2",
      img: "assets/images/bk.png",
      start: "g8",
      type: "knight"
    },
    wb1: {
      name: "wb1",
      img: "assets/images/wb.png",
      start: "c1",
      type: "bishop"
    },
    wb2: {
      name: "wb2",
      img: "assets/images/wb.png",
      start: "f1",
      type: "bishop"
    },
    bb1: {
      name: "bb1",
      img: "assets/images/bb.png",
      start: "c8",
      type: "bishop"
    },
    bb2: {
      name: "bb2",
      img: "assets/images/bb.png",
      start: "f8",
      type: "bishop"
    },
    wq: {
      name: "wq",
      img: "assets/images/wq.png",
      start: "d1",
      type: "queen"
    },
    bq: {
      name: "bq",
      img: "assets/images/bq.png",
      start: "e8",
      type: "queen"
    },
    wki: {
      name: "wki",
      img: "assets/images/wki.png",
      start: "e1",
      type: "king",
      hasBeenMoved: false
    },
    bki: {
      name: "bki",
      img: "assets/images/bki.png",
      start: "d8",
      type: "king",
      hasBeenMoved: false
    }
  };
  const MOVEPIECE = (piece, location, destination) => {
    let position = location.split("");
    let goTo = destination.split("");
    historyRef.set({
      pieces: PIECES,
      lastBoard: chessboard,
      whoseTurn: myColor
    });
    lastMoveRef.set({
      from: location,
      to: destination
    });
    if ($(`#${destination}`).hasClass("ap")) {
      console.log($(`#${goTo[0]}${position[1]}`).attr("id"));
      $(".ap").removeClass("ap");
      $(`#${goTo[0]}${position[1]}`)
        .removeClass("w b piece")
        .attr("data-occupying", "")
        .empty();
      chessboard[goTo[0]][position[1] - 1] = "empty";
    } else if ($(`#${destination}`).hasClass("cml")) {
      console.log(`#${letters[letters.indexOf(goTo[0]) + 1]}${goTo[1]}`);
      $(`#a${goTo[1]}`)
        .attr("data-occupying", "")
        .removeClass("w b piece")
        .empty();
      chessboard[letters[letters.indexOf(goTo[0]) + 1]][goTo[1] - 1] = `${
        myColor[0]
      }r1`;
      chessboard.a[goTo[1] - 1] = "empty";
      PIECES[`${myColor[0]}ki`].hasBeenMoved = true;
      PIECES[`${myColor[0]}r1`].hasBeenMoved = true;
      piecesRef.set(PIECES);
    } else if ($(`#${destination}`).hasClass("cmr")) {
      $(`#h${goTo[1] - 1}`)
        .attr("data-occupying", "")
        .removeClass("w b piece")
        .empty();
      chessboard[letters[letters.indexOf(goTo[0]) - 1]][goTo[1] - 1] = `${
        myColor[0]
      }r2`;
      chessboard.h[goTo[1] - 1] = "empty";
      PIECES[`${myColor[0]}ki`].hasBeenMoved = true;
      PIECES[`${myColor[0]}r2`].hasBeenMoved = true;
      piecesRef.set(PIECES);
    }
    if (chessboard[goTo[0]][goTo[1] - 1] === `${opponentColor[0]}ki`) {
      currentGame.set({ whoseTurn: `${myColor}wins` });
    } else if (
      piece.type === "pawn" &&
      (destination[1] === "1" || destination[1] === "8")
    ) {
      $(".hover").removeClass("hover");
      $(".selected").removeClass("selected");
      $(`#${location}`)
        .removeClass("w b piece")
        .attr("data-occupying", "")
        .empty();
      const thisprompt = () => {
        swal("How will you promote your pawn?", {
          buttons: {
            queen: {
              text: "Queen",
              value: "queen"
            },
            knight: {
              text: "Knight",
              value: "knight"
            },
            rook: {
              text: "Rook",
              value: "rook"
            },
            bishop: {
              text: "Bishop",
              value: "bishop"
            }
          }
        }).then(value => {
          switch (value) {
            case "queen":
              PIECES[`${myColor[0]}q2`] = {
                name: `${myColor[0]}q2`,
                img: `assets/images/${myColor[0]}q.png`,
                type: "queen"
              };
              piecesRef.set(PIECES);
              chessboard[goTo[0]][goTo[1] - 1] = PIECES[`${myColor[0]}q2`].name;
              chessboardRef.set(chessboard);
              currentGame.set({
                whoseTurn: opponentColor
              });
              break;
            case "knight":
              PIECES[`${myColor[0]}k3`] = {
                name: `${myColor[0]}k3`,
                img: `assets/images/${myColor[0]}k.png`,
                type: "knight"
              };
              piecesRef.set(PIECES);
              chessboard[goTo[0]][goTo[1] - 1] = PIECES[`${myColor[0]}k3`].name;
              chessboardRef.set(chessboard);
              currentGame.set({
                whoseTurn: opponentColor
              });
              break;
            case "rook":
              PIECES[`${myColor[0]}r3`] = {
                name: `${myColor[0]}r3`,
                img: `assets/images/${myColor[0]}r.png`,
                type: "rook"
              };
              piecesRef.set(PIECES);
              chessboard[goTo[0]][goTo[1] - 1] = PIECES[`${myColor[0]}r3`].name;
              chessboardRef.set(chessboard);
              currentGame.set({
                whoseTurn: opponentColor
              });
              break;
            case "bishop":
              PIECES[`${myColor[0]}b3`] = {
                name: `${myColor[0]}b3`,
                img: `assets/images/${myColor[0]}b.png`,
                type: "bishop"
              };
              piecesRef.set(PIECES);
              chessboard[goTo[0]][goTo[1] - 1] = PIECES[`${myColor[0]}b3`].name;
              chessboardRef.set(chessboard);
              currentGame.set({
                whoseTurn: opponentColor
              });
              break;
            default:
              thisprompt();
          }
        });
      };
      thisprompt();
    } else {
      $(".hover").removeClass("hover");
      $(".selected").removeClass("selected");
      $(`#${location}`)
        .removeClass("w b piece")
        .attr("data-occupying", "")
        .empty();
      chessboard[position[0]][position[1] - 1] = "empty";
      chessboard[goTo[0]][goTo[1] - 1] = piece.name;
      if (piece.hasBeenMoved === false) {
        PIECES[piece.name].hasBeenMoved = "justMoved";
        piecesRef.set(PIECES);
      } else if (piece.hasBeenMoved === "justMoved") {
        PIECES[piece.name].hasBeenMoved = true;
        piecesRef.set(PIECES);
      }
      chessboardRef.set(chessboard);
      currentGame.set({
        whoseTurn: opponentColor
      });
    }
  };
  const WHITEMOVEMENTOPTIONS = {
    pawn: (piece, x, y) => {
      let moveArr = [];
      if (chessboard[x][y + 1] === "empty") {
        if (y + 1 < 8) {
          moveArr.push([x, y + 1]);
        }
        if (piece.hasBeenMoved === false && chessboard[x][y + 2] === "empty") {
          moveArr.push([x, y + 2]);
        }
      }
      //capture/a passant
      if (x !== "a") {
        if (chessboard[letters[letters.indexOf(x) - 1]][y + 1][0] === "b") {
          moveArr.push([letters[letters.indexOf(x) - 1], y + 1]);
        }
        if (chessboard[letters[letters.indexOf(x) - 1]][y][0] === "b") {
          if (
            PIECES[chessboard[letters[letters.indexOf(x) - 1]][y]]
              .hasBeenMoved === "justMoved"
          ) {
            moveArr.push(["ap", letters[letters.indexOf(x) - 1], y + 1]);
          }
        }
      }
      //capture/a passant
      if (x !== "h") {
        if (chessboard[letters[letters.indexOf(x) + 1]][y + 1][0] === "b") {
          moveArr.push([letters[letters.indexOf(x) + 1], y + 1]);
        }
        if (chessboard[letters[letters.indexOf(x) + 1]][y][0] === "b") {
          if (
            PIECES[chessboard[letters[letters.indexOf(x) + 1]][y]]
              .hasBeenMoved === "justMoved"
          ) {
            moveArr.push(["ap", letters[letters.indexOf(x) + 1], y + 1]);
          }
        }
      }
      return moveArr;
    },
    knight: (piece, x, y) => {
      const allOptions = [];
      for (let x = -2; x <= 2; x++) {
        if (x !== 0) {
          for (let y = -2; y <= 2; y++) {
            if (Math.abs(y) !== Math.abs(x) && y !== 0) {
              allOptions.push([x, y]);
            }
          }
        }
      }
      let moveArr = [];
      allOptions.forEach(option => {
        let optionX = letters[letters.indexOf(x) + option[0]];
        let optionY = y + option[1];
        if (optionX && optionY < 8 && optionY >= 0) {
          if (
            chessboard[optionX][optionY] &&
            chessboard[optionX][optionY].charAt(0) !== "w"
          ) {
            moveArr.push([optionX, optionY]);
          }
        }
      });
      return moveArr;
    },
    bishop: (piece, x, y) => {
      let xIndex = letters.indexOf(x);
      const upLeft = [];
      const downLeft = [];
      const upRight = [];
      const downRight = [];
      let moveArr = [];
      for (let x = 1; x < xIndex + 1; x++) {
        if (y + x < 8) {
          upLeft.push([xIndex - x, y + x]);
        }
        if (y - x > -1) {
          downLeft.push([xIndex - x, y - x]);
        }
      }
      for (let x = 1; x < 8 - xIndex; x++) {
        if (y + x < 8) {
          upRight.push([xIndex + x, y + x]);
        }
        if (y - x > -1) {
          downRight.push([xIndex + x, y - x]);
        }
      }
      upLeft.sort((a, b) => b[0] - a[0]);
      downLeft.sort((a, b) => b[0] - a[0]);
      upRight.sort((a, b) => a[0] - b[0]);
      downRight.sort((a, b) => a[0] - b[0]);
      let options = [upLeft, downLeft, upRight, downRight];
      options.forEach(arr => {
        for (let x = 0; x < arr.length; x++) {
          let opt = arr[x];
          if (chessboard[letters[opt[0]]][opt[1]] === "empty") {
            moveArr.push([letters[opt[0]], opt[1]]);
          } else if (chessboard[letters[opt[0]]][opt[1]].charAt(0) === "b") {
            moveArr.push([letters[opt[0]], opt[1]]);
            break;
          } else {
            break;
          }
        }
      });
      return moveArr;
    },
    rook: (piece, x, y) => {
      let xIndex = letters.indexOf(x);
      const left = [];
      const right = [];
      const down = [];
      const up = [];
      let moveArr = [];
      for (let i = 0; i < xIndex; i++) {
        left.push([i, y]);
      }
      for (let i = xIndex + 1; i < 8; i++) {
        right.push([i, y]);
      }
      for (let i = 0; i < y; i++) {
        down.push([xIndex, i]);
      }
      for (let i = y + 1; i < 8; i++) {
        up.push([xIndex, i]);
      }
      left.sort((a, b) => b[0] - a[0]);
      right.sort((a, b) => a[0] - b[0]);
      down.sort((a, b) => b[1] - a[1]);
      up.sort((a, b) => a[1] - b[1]);
      const options = [left, right, up, down];
      options.forEach(arr => {
        for (let i = 0; i < arr.length; i++) {
          let opt = arr[i];
          if (chessboard[letters[opt[0]]][opt[1]] === "empty") {
            moveArr.push([letters[opt[0]], opt[1]]);
          } else if (chessboard[letters[opt[0]]][opt[1]].charAt(0) === "b") {
            moveArr.push([letters[opt[0]], opt[1]]);
            break;
          } else {
            break;
          }
        }
      });
      return moveArr;
    },
    queen: (piece, x, y) => {
      let xIndex = letters.indexOf(x);
      const up = [];
      const upRight = [];
      const right = [];
      const downRight = [];
      const down = [];
      const downLeft = [];
      const left = [];
      const upLeft = [];
      let moveArr = [];
      for (let i = y + 1; i < 8; i++) {
        up.push([xIndex, i]);
      }
      for (let i = xIndex + 1; i < 8; i++) {
        right.push([i, y]);
      }
      for (let x = 1; x < 8 - xIndex; x++) {
        if (y + x < 8) {
          upRight.push([xIndex + x, y + x]);
        }
        if (y - x > -1) {
          downRight.push([xIndex + x, y - x]);
        }
      }
      for (let i = 0; i < y; i++) {
        down.push([xIndex, i]);
      }
      for (let i = 0; i < xIndex; i++) {
        left.push([i, y]);
      }
      for (let x = 1; x < xIndex + 1; x++) {
        if (y + x < 8) {
          upLeft.push([xIndex - x, y + x]);
        }
        if (y - x > -1) {
          downLeft.push([xIndex - x, y - x]);
        }
      }
      up.sort((a, b) => a[1] - b[1]);
      upRight.sort((a, b) => a[0] - b[0]);
      right.sort((a, b) => a[0] - b[0]);
      downRight.sort((a, b) => a[0] - b[0]);
      down.sort((a, b) => b[1] - a[1]);
      downLeft.sort((a, b) => b[0] - a[0]);
      left.sort((a, b) => b[0] - a[0]);
      upLeft.sort((a, b) => b[0] - a[0]);
      const options = [
        up,
        upRight,
        right,
        downRight,
        down,
        downLeft,
        left,
        upLeft
      ];
      options.forEach(arr => {
        for (let i = 0; i < arr.length; i++) {
          let opt = arr[i];
          if (chessboard[letters[opt[0]]][opt[1]] === "empty") {
            moveArr.push([letters[opt[0]], opt[1]]);
          } else if (chessboard[letters[opt[0]]][opt[1]].charAt(0) === "b") {
            moveArr.push([letters[opt[0]], opt[1]]);
            break;
          } else {
            break;
          }
        }
      });
      return moveArr;
    },
    king: (piece, x, y) => {
      const moveArr = [];
      //Castle move
      if (!piece.hasBeenMoved) {
        if (!PIECES[`${piece.name[0]}r1`].hasBeenMoved) {
          let go = true;
          if (chessboard["a"][0] !== "empty") {
            for (let i = 1; i < letters.indexOf(x); i++) {
              if (chessboard[letters[i]][0] !== "empty") {
                go = false;
                break;
              }
            }
          }
          if (go) {
            moveArr.push(["cml", "c", 0]);
          }
        }
        if (!PIECES[`${piece.name[0]}r2`].hasBeenMoved) {
          let go = true;
          if (chessboard[letters[7]][0] !== "empty") {
            for (let i = letters.indexOf(x) + 1; i < 7; i++) {
              console.log(i, chessboard[letters[i]][0]);
              if (chessboard[letters[i]][0] !== "empty") {
                go = false;
                break;
              }
            }
          }
          if (go) {
            moveArr.push(["cmr", "g", 0]);
          }
        }
      }
      let options = [];
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (
            !(i === 0 && j === 0) &&
            letters.indexOf(x) + i >= 0 &&
            letters.indexOf(x) + i < 8 &&
            y + j >= 0 &&
            y + j < 8
          ) {
            options.push([letters.indexOf(x) + i, y + j]);
          }
        }
      }
      console.log("options", options);
      for (let i = 0; i < options.length; i++) {
        console.log("option: ", options[i]);
        if (
          chessboard[letters[options[i][0]]][options[i][1]][0] === "w" ||
          amIInCheck([letters[options[i][0]], options[i][1]])
        ) {
          options.splice(i, 1);
          i--;
        }
      }
      options.forEach(arr => {
        moveArr.push([letters[arr[0]], arr[1]]);
      });
      return moveArr;
    }
  };
  const BLACKMOVEMENTOPTIONS = {
    pawn: (piece, x, y) => {
      let moveArr = [];
      if (chessboard[x][y - 1] === "empty") {
        if (y - 1 >= 0) {
          moveArr.push([x, y - 1]);
        }
        if (piece.hasBeenMoved === false && chessboard[x][y - 2] === "empty") {
          moveArr.push([x, y - 2]);
        }
      }
      //capture/a passant
      if (x !== "a") {
        if (chessboard[letters[letters.indexOf(x) - 1]][y - 1][0] === "w") {
          moveArr.push([letters[letters.indexOf(x) - 1], y - 1]);
        }
        if (chessboard[letters[letters.indexOf(x) - 1]][y][0] === "w") {
          if (
            PIECES[chessboard[letters[letters.indexOf(x) - 1]][y]]
              .hasBeenMoved === "justMoved"
          ) {
            moveArr.push(["ap", letters[letters.indexOf(x) - 1], y - 1]);
          }
        }
      }
      //capture/a passant
      if (x !== "h") {
        if (chessboard[letters[letters.indexOf(x) + 1]][y - 1][0] === "w") {
          moveArr.push([letters[letters.indexOf(x) + 1], y - 1]);
        }
        if (chessboard[letters[letters.indexOf(x) + 1]][y][0] === "w") {
          if (
            PIECES[chessboard[letters[letters.indexOf(x) + 1]][y]]
              .hasBeenMoved === "justMoved"
          ) {
            moveArr.push(["ap", letters[letters.indexOf(x) + 1], y - 1]);
          }
        }
      }
      return moveArr;
    },
    knight: (piece, x, y) => {
      const allOptions = [];
      for (let x = -2; x <= 2; x++) {
        if (x !== 0) {
          for (let y = -2; y <= 2; y++) {
            if (Math.abs(y) !== Math.abs(x) && y !== 0) {
              allOptions.push([x, y]);
            }
          }
        }
      }
      let moveArr = [];
      allOptions.forEach(option => {
        let optionX = letters[letters.indexOf(x) + option[0]];
        let optionY = y + option[1];
        if (optionX && optionY < 8 && optionY >= 0) {
          if (
            chessboard[optionX][optionY] &&
            chessboard[optionX][optionY].charAt(0) !== "b"
          ) {
            moveArr.push([optionX, optionY]);
          }
        }
      });
      return moveArr;
    },
    bishop: (piece, x, y) => {
      let xIndex = letters.indexOf(x);
      const upLeft = [];
      const downLeft = [];
      const upRight = [];
      const downRight = [];
      let moveArr = [];
      for (let x = 1; x < xIndex + 1; x++) {
        if (y + x < 8) {
          upLeft.push([xIndex - x, y + x]);
        }
        if (y - x > -1) {
          downLeft.push([xIndex - x, y - x]);
        }
      }
      for (let x = 1; x < 8 - xIndex; x++) {
        if (y + x < 8) {
          upRight.push([xIndex + x, y + x]);
        }
        if (y - x > -1) {
          downRight.push([xIndex + x, y - x]);
        }
      }
      upLeft.sort((a, b) => b[0] - a[0]);
      downLeft.sort((a, b) => b[0] - a[0]);
      upRight.sort((a, b) => a[0] - b[0]);
      downRight.sort((a, b) => a[0] - b[0]);
      let options = [upLeft, downLeft, upRight, downRight];
      options.forEach(arr => {
        for (let x = 0; x < arr.length; x++) {
          let opt = arr[x];
          if (chessboard[letters[opt[0]]][opt[1]] === "empty") {
            moveArr.push([letters[opt[0]], opt[1]]);
          } else if (chessboard[letters[opt[0]]][opt[1]].charAt(0) === "w") {
            moveArr.push([letters[opt[0]], opt[1]]);
            break;
          } else {
            break;
          }
        }
      });
      return moveArr;
    },
    rook: (piece, x, y) => {
      let xIndex = letters.indexOf(x);
      const left = [];
      const right = [];
      const down = [];
      const up = [];
      let moveArr = [];
      for (let i = 0; i < xIndex; i++) {
        left.push([i, y]);
      }
      for (let i = xIndex + 1; i < 8; i++) {
        right.push([i, y]);
      }
      for (let i = 0; i < y; i++) {
        down.push([xIndex, i]);
      }
      for (let i = y + 1; i < 8; i++) {
        up.push([xIndex, i]);
      }
      left.sort((a, b) => b[0] - a[0]);
      right.sort((a, b) => a[0] - b[0]);
      down.sort((a, b) => b[1] - a[1]);
      up.sort((a, b) => a[1] - b[1]);
      const options = [left, right, up, down];
      options.forEach(arr => {
        for (let i = 0; i < arr.length; i++) {
          let opt = arr[i];
          if (chessboard[letters[opt[0]]][opt[1]] === "empty") {
            moveArr.push([letters[opt[0]], opt[1]]);
          } else if (chessboard[letters[opt[0]]][opt[1]].charAt(0) === "w") {
            moveArr.push([letters[opt[0]], opt[1]]);
            break;
          } else {
            break;
          }
        }
      });
      return moveArr;
    },
    queen: (piece, x, y) => {
      let xIndex = letters.indexOf(x);
      const up = [];
      const upRight = [];
      const right = [];
      const downRight = [];
      const down = [];
      const downLeft = [];
      const left = [];
      const upLeft = [];
      let moveArr = [];
      for (let i = y + 1; i < 8; i++) {
        up.push([xIndex, i]);
      }
      for (let i = xIndex + 1; i < 8; i++) {
        right.push([i, y]);
      }
      for (let x = 1; x < 8 - xIndex; x++) {
        if (y + x < 8) {
          upRight.push([xIndex + x, y + x]);
        }
        if (y - x > -1) {
          downRight.push([xIndex + x, y - x]);
        }
      }
      for (let i = 0; i < y; i++) {
        down.push([xIndex, i]);
      }
      for (let i = 0; i < xIndex; i++) {
        left.push([i, y]);
      }
      for (let x = 1; x < xIndex + 1; x++) {
        if (y + x < 8) {
          upLeft.push([xIndex - x, y + x]);
        }
        if (y - x > -1) {
          downLeft.push([xIndex - x, y - x]);
        }
      }
      up.sort((a, b) => a[1] - b[1]);
      upRight.sort((a, b) => a[0] - b[0]);
      right.sort((a, b) => a[0] - b[0]);
      downRight.sort((a, b) => a[0] - b[0]);
      down.sort((a, b) => b[1] - a[1]);
      downLeft.sort((a, b) => b[0] - a[0]);
      left.sort((a, b) => b[0] - a[0]);
      upLeft.sort((a, b) => b[0] - a[0]);
      const options = [
        up,
        upRight,
        right,
        downRight,
        down,
        downLeft,
        left,
        upLeft
      ];
      options.forEach(arr => {
        for (let i = 0; i < arr.length; i++) {
          let opt = arr[i];
          if (chessboard[letters[opt[0]]][opt[1]] === "empty") {
            moveArr.push([letters[opt[0]], opt[1]]);
          } else if (chessboard[letters[opt[0]]][opt[1]].charAt(0) === "w") {
            moveArr.push([letters[opt[0]], opt[1]]);
            break;
          } else {
            break;
          }
        }
      });
      return moveArr;
    },
    king: (piece, x, y) => {
      const moveArr = [];
      //Castle move
      if (!piece.hasBeenMoved) {
        if (!PIECES[`${piece.name[0]}r1`].hasBeenMoved) {
          let go = true;
          if (chessboard["a"][7] !== "empty") {
            for (let i = 1; i < letters.indexOf(x); i++) {
              if (chessboard[letters[i]][7] !== "empty") {
                go = false;
                break;
              }
            }
          }
          if (go) {
            moveArr.push(["cml", "b", 7]);
          }
        }
        if (!PIECES[`${piece.name[0]}r2`].hasBeenMoved) {
          let go = true;
          if (chessboard[letters[7]][7] !== "empty") {
            for (let i = letters.indexOf(x) + 1; i < 7; i++) {
              if (chessboard[letters[i]][7] !== "empty") {
                go = false;
                break;
              }
            }
          }
          if (go) {
            moveArr.push(["cmr", "f", 7]);
          }
        }
      }
      let options = [];
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (
            !(i === 0 && j === 0) &&
            letters.indexOf(x) + i >= 0 &&
            letters.indexOf(x) + i < 8 &&
            y + j >= 0 &&
            y + j < 8
          ) {
            options.push([letters.indexOf(x) + i, y + j]);
          }
        }
      }
      for (let i = 0; i < options.length; i++) {
        console.log("option", options[i]);
        if (
          chessboard[letters[options[i][0]]][options[i][1]][0] === "b" ||
          amIInCheck([letters[options[i][0]], options[i][1]])
        ) {
          options.splice(i, 1);
          i--;
        }
      }
      options.forEach(arr => {
        moveArr.push([letters[arr[0]], arr[1]]);
      });
      return moveArr;
    }
  };
  const showMovementOptions = arr => {
    $(".hover").removeClass("hover");
    console.log("movement array: ", arr);
    if (arr && arr !== "CHECKMATE") {
      arr.forEach(opt => {
        if (opt[0] === "ap") {
          opt[2]++;
          $(`#${opt[1] + opt[2]}`).addClass("hover ap");
        } else if (opt[0] === "cml") {
          opt[2]++;
          $(`#${opt[1] + opt[2]}`).addClass("hover cml");
        } else if (opt[0] === "cmr") {
          opt[2]++;
          $(`#${opt[1] + opt[2]}`).addClass("hover cmr");
        } else {
          opt[1]++;
          $(`#${opt.join("")}`).addClass("hover");
        }
      });
    }
  };
  const setUpGame = () => {
    chessboard = JSON.parse(JSON.stringify(chessboardStart));
    chessboardRef.set(chessboard);
    lastMoveRef.set({
      from: "",
      to: ""
    });
    currentGame.set({
      whoseTurn: "white"
    });
    Object.keys(PIECES).forEach(piece => {
      PIECES[piece].hasBeenMoved = false;
    });
    piecesRef.set(PIECES);
    $(".piece")
      .empty()
      .removeClass("w b piece")
      .attr("data-occupying", "");
    Object.keys(PIECES).forEach(piece => {
      let currentPiece = PIECES[piece];
      $(`#${currentPiece.start}`)
        .attr("data-occupying", piece)
        .addClass(`${piece[0]} piece`);
      const imgFill = $("<img>").attr("src", currentPiece.img);
      $(`#${currentPiece.start}`).html(imgFill);
    });
  };
  const myKingPosition = () => {
    const kingPos = [];
    const king = myColor[0] + "ki";
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (chessboard[letters[x]][y] === king) {
          kingPos.push(letters[x], y);
          break;
        }
      }
      if (kingPos.length > 0) break;
    }
    return kingPos;
  };
  const amIInCheck = (position = myKingPosition()) => {
    let inCheck = "";
    const opponentPieces = $(`.${opponentColor[0]}`).toArray();
    opponentPieces.forEach(piece => {
      const whichPiece = PIECES[$(piece).attr("data-occupying")];
      const pieceXY = $(piece)
        .attr("id")
        .split("");
      pieceXY[1] = JSON.parse(pieceXY[1]) - 1;
      let pieceOpts = [];
      if (myColor === "white" && whichPiece.type !== "king") {
        pieceOpts = BLACKMOVEMENTOPTIONS[whichPiece.type](
          whichPiece,
          pieceXY[0],
          JSON.parse(pieceXY[1])
        );
        if (
          whichPiece.type !== "pawn" &&
          JSON.stringify(pieceOpts).indexOf(JSON.stringify(position)) !== -1
        ) {
          inCheck += whichPiece.name;
        } else if (
          whichPiece.type === "pawn" &&
          (JSON.stringify([
            letters[letters.indexOf(pieceXY[0]) + 1],
            pieceXY[1] - 1
          ]) === JSON.stringify(position) ||
            JSON.stringify([
              letters[letters.indexOf(pieceXY[0]) - 1],
              pieceXY[1] - 1
            ]) === JSON.stringify(position))
        ) {
          inCheck += whichPiece.name;
        }
      } else if (myColor === "black" && whichPiece.type !== "king") {
        pieceOpts = WHITEMOVEMENTOPTIONS[whichPiece.type](
          whichPiece,
          pieceXY[0],
          JSON.parse(pieceXY[1])
        );
        if (
          whichPiece.type !== "pawn" &&
          JSON.stringify(pieceOpts).indexOf(JSON.stringify(position)) !== -1
        ) {
          inCheck += whichPiece.name;
        } else if (
          whichPiece.type === "pawn" &&
          (JSON.stringify([
            letters[letters.indexOf(pieceXY[0]) + 1],
            pieceXY[1] - 1
          ]) === JSON.stringify(position) ||
            JSON.stringify([
              letters[letters.indexOf(pieceXY[0]) - 1],
              pieceXY[1] - 1
            ]) === JSON.stringify(position))
        ) {
          inCheck += whichPiece.name;
        }
      }
    });
    return inCheck;
  };
  ////////////////////////////////////////////////
  //background shifting!!!!!
  ////////////////////////////////////////////////
  // const colorInterval = setInterval(function() {
  //   $(".white").toggleClass("aqua");
  // }, 500);
  $(document).on("click", ".piece", function() {
    let coordinate = $(this).attr("id");
    let locArr = coordinate.split("");
    let xPos = locArr[0];
    let yPos = locArr[1] - 1;
    const thisPiece = PIECES[$(this).attr("data-occupying")];
    if (!$(this).hasClass("hover") && !$(this).hasClass("selected")) {
      $(".selected").removeClass("selected");
      $(this).addClass("selected");
      if (myTurn && myColor === "white") {
        if ($(this).hasClass("w")) {
          showMovementOptions(
            WHITEMOVEMENTOPTIONS[thisPiece.type](thisPiece, xPos, yPos)
          );
        }
      } else if (myTurn && myColor === "black") {
        if ($(this).hasClass("b")) {
          showMovementOptions(
            BLACKMOVEMENTOPTIONS[thisPiece.type](thisPiece, xPos, yPos)
          );
        }
      }
    } else if ($(this).hasClass("selected")) {
      $(this).removeClass("selected");
      $(".hover").removeClass("hover");
    }
  });
  $(document).on("click", ".hover", function() {
    MOVEPIECE(
      PIECES[$(".selected").attr("data-occupying")],
      $(".selected").attr("id"),
      $(this).attr("id")
    );
  });
  $(document).on("click", "#new-game", function() {
    setUpGame();
  });
  $(document).on("click", "#undo-btn", function() {
    if (myColor === "white") {
      undoRef.update({ white: true });
    } else if (myColor === "black") {
      undoRef.update({ black: true });
    }
  });
});
