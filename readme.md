Server(Neuigkeiten):
01.05.2025: Im Ordner Server existiert jetzt eine Changelog.txt, in der aktuelle Serveränderungen vermerkt werden.

Server(Installation, wenn Node schon vorhanden ist; vorher in Ordner Server navigieren):
npm init -y
npm install typescript ts-node @types/node --save-dev
npx tsc --init

Server(Starten, wenn man sich im Ordner Server befindet):
npx ts-node server.ts

