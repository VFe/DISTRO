# Running DISTRO locally

## Requirements

- [Node.JS (0.3)](http://nodejs.org/)
- [MongoDB (1.6.5)](http://www.mongodb.org/)
- Node modules (can be installed with [NPM](http://npmjs.org/))
  - [Connect](https://github.com/senchalabs/connect) (NPM: `connect`)
  - [node-mongodb-native](https://github.com/christkv/node-mongodb-native) (NPM: `mongodb`)
  - [uuidjs](https://bitbucket.org/nikhilm/uuidjs) (NPM: `uuid`)

## Useful packages

- [node-dev](https://github.com/fgnass/node-dev) (NPM: `node-dev`)
- [node-inspector](https://github.com/dannycoates/node-inspector) (NPM: `node-inspector`)

The simplest way to run DISTRO is to start `mongod` in one shell and, in a separate shell, `cd` into the DISTRO repository and run `node-dev server/distro-server.js` or `node-dev server/upload-server.js`

You can run test/populate.sh to populate your local mongo instance with test data. One account will be installed, `test@distro.fm`:`password`.