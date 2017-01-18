
/// <reference path="../../typings/index.d.ts" />

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as path from "path";

import { SetupRoutes } from './routes';

var conf = require('../../settings.js');

//initialize singletons
import { EmailMgr } from './util/Email';
new EmailMgr(conf.mgm.mail);

let app = express();

var cookieParser = require('cookie-parser')
app.use(cookieParser('super-secret-cookie-session-key!!!1!'));

app.use(bodyParser.json({ limit: '1gb' }));       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true,
  limit: '1gb'
}));

app.use('/', SetupRoutes(conf));

app.listen(3000, function() {
  console.log('MGM listening on port 3000!');
});
