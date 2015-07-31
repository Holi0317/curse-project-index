# curse-project-search
Make searching in [curseforge](http://minecraft.curseforge.com/mc-mods) more powerful than before

## Introduction
As curseforge's search function is not that good, especially when it comes with words that have special character. I decided to create my own search function for curseforge. Also, threat it as an opportunity to learn node.js.

The main goal was, originally, to create an API for curseforge. However, during the coding process, I found normal users can also get benefit from this as mis-spell, especially with non-common or created words is quite common. Therefore, I wrote a (terrable) UI for this.

Currently, only minecraft mods is listed in my database, as I do not play other games ;p

Reminder: I am not a UI designer and I know how terrible the UI is. I have tried >.>

## Usage
[Deployed site](https://cps.holi0317.net/)

## Deploy your own
1. Install `node.js, npm, mongodb, git` in your system.
2. Run `npm i -g bower`. you may need to add `sudo` as prefix if you need it.
3. Clone this repository
4. Goto the cloned directory and run `bower i && npm i --dev && gulp`
5. Run mongodb in your system. Please check your distro's wiki for details.
6. Run `npm start` to run the server.
7. Run `node -e "require('./job')()"` to manually update the database. Please manually kill it when you see `Finished cron job`.
8. Done ;)

## Update
1. Run `git pull` to fetch the latest update
2. Stop node.js server.
3. Run `npm prune && bower prune && bower i && npm i --dev && gulp`

## TO-DO
1. Make a gulp script for vulcanize, minify before serving. 700kb is way too large.
2. Wait for paper-dropdown-menu
3. Make a shell script for changing base url and update
