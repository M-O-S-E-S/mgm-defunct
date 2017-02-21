
import { IPool } from 'promise-mysql';

import { IPendingUser } from '../Types';
import { Credential } from '../Auth';

interface pending_user_row {
  name: string
  email: string
  gender: string
  password: string
  registered: Date
  summary: string
}

export class PendingUsers {
  private db: IPool

  constructor(db: IPool) {
    this.db = db;
  }

  getAll(): Promise<IPendingUser[]> {
    return this.db.query('SELECT * FROM users');
  }

  create(name: string, email: string, template: string, credential: Credential, summary: string): Promise<IPendingUser> {
    let user: IPendingUser = {
      name: name,
      email: email,
      gender: template,
      password: credential.hash,
      registered: new Date(),
      summary: summary
    }
    return this.db.query('INSERT INTO users SET ?', user).then(() => {
      return user;
    });
  }

  /*
  getByName(name: string): Promise<PendingUser> {
    return this.db.findOne({
      where: {
        Name: name
      }
    });
  }
  */
}