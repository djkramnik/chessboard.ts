<img src="https://github.com/djkramnik/chessboard.ts/assets/4875848/56e7982d-c4f3-4942-9f05-b098970d4c07" alt="kramnik" width="200"/>

# Chessboard.ts

### Backstory

Needed a headless chessboard UI.  Most popular lib I'm familiar with, [chessboard.js](https://chessboardjs.com), had some issues for my use case.
I want the ability to make my own chess rule variants and chessboard.js doesn't exactly make this easy with its baked in rules. 
So this is distinguished not just by being in TS, not just by being a big waste of my time, but also by being completely unopinionated about anything pertaining
to chess rules. You implement those yourself.  

### React sux imo

This is intended to later be used with a react component wrapping it.  I found it pretty difficult to code an efficient chessboard in React, and I don't
want to bend over backwards just to do things the react way.  But this _is_ intended to be friendly for use in a react component, and interacting 
with react state via pubsub.  

*This is a wip.  Will update this when its done, if ever* 

### Try it out
`npm run watch && npm run serve`  You will have to install this globally for now: https://www.npmjs.com/package/http-server
