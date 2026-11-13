/*****************************************************************************
 * Import package                                                            *
 *****************************************************************************/
import express, {Express, NextFunction, Request, Response} from 'express';
import {Connection, createConnection, FieldPacket, ResultSetHeader, RowDataPacket} from "mysql2/promise";
import session from "express-session";
import * as path from "node:path";
import bcrypt from "bcrypt";

/*****************************************************************************
 * Database Connection                                                       *
 *****************************************************************************/
let database: Connection;
async function connectDatabase() {
  try {
    database = await createConnection({
      host: "localhost",
      user: "root",
      password: "toortoor",
      database: "usermanager_all"
    });
    await database.connect();
    console.log("Database is connected");
  } catch (error: unknown) {
    console.log(`Database connection failed.`);
    console.error(error);
    process.exit(1);
  }
}
connectDatabase();

/*****************************************************************************
 * Define and start web-app server, define json-Parser                       *
 *****************************************************************************/
const app: Express = express();
app.listen(8080, () => {
  console.log('Server started: http://localhost:8080');
});
app.use(express.json());

/*****************************************************************************
 * session management configuration                                          *
 *****************************************************************************/
app.use(session({
  // save session even if not modified
  resave: true,
  // save session even if not used
  saveUninitialized: true,
  // forces cookie set on every response needed to set expiration (maxAge)
  rolling: true,
  // encrypt session-id in cookie using "secret" as modifier
  secret: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  // set some cookie-attributes. Here expiration-date (offset in ms)
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 5 } // 5 days
}));

declare module 'express-session' {
  interface SessionData {
    user: User | null
  }
}

/*****************************************************************************
 * Datastructure                                                             *
 *****************************************************************************/
export interface User {
  id: number;
  givenName: string;
  familyName: string;
  creationTime: string;
}

function isLoggedIn(req: Request, res: Response, next: NextFunction) {
  // Abstract middleware route for checking login state of the user
  if (req.session.user != null) {
    // User has an active session and is logged in, continue with route
    next();
  } else {
    // User is not logged in
    res.status(401).send({
      message: 'User not authorized.',
    });
  }
}

/*****************************************************************************
 * HTTP ROUTES: LOGIN                                                        *
 *****************************************************************************/
/**
 * @api {get} /login Request login state
 * @apiName GetLogin
 * @apiGroup Login
 *
 * @apiSuccess {User} user The user object
 * @apiSuccess {string} message Message stating that the user is still logged in
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *     "user":{
 *         "id":1,
 *         "givenName":"Peter",
 *         "familyName":"Kneisel",
 *         "creationTime":"24.09.2022, 12:24:59"
 *      },
 *      "message":"User still logged in"
 *  }
 *
 * @apiError (401 Unauthorized) {String} message A valid login session is required. Send the session cookie from POST /login.
 *
 * @apiErrorExample {json} SessionNotFound:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message": "User not authorized."
 * }
 */
app.get('/login', isLoggedIn, (req: Request, res: Response): void => {
  res.status(200).send({
    message: 'User still logged in',
    user: req.session.user, // Send user object to client for greeting message
  });
});


/**
 * @api {post} /login Send login request
 * @apiName PostLogin
 * @apiGroup Login
 * @apiDescription Send a JSON body. On success, retain the session cookie for authenticated requests.
 *
 * @apiBody {string} username Username of the user to log in
 * @apiBody {string} password Password of the user to log in
 *
 * @apiSuccess {User} user The user object
 * @apiSuccess {string} message Message stating the user logged in successfully
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *     "user":{
 *         "id":1,
 *         "givenName":"Peter",
 *         "familyName":"Kneisel",
 *         "creationTime":"24.09.2022, 12:24:59"
 *     },
 *     "message":"Successfully logged in"
 * }
 *
 * @apiError (401 Unauthorized) {String} message The username or password is incorrect.
 *
 * @apiErrorExample {json} LoginIncorrect:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message":"Username or password is incorrect."
 * }
 *
 * @apiError (500 Internal Server Error) {String} message The database request failed.
 *
 * @apiErrorExample {json} DatabaseRequestFailed:
 * HTTP/1.1 500 Internal Server Error
 * {
 *     "message": "Database request failed: ..."
 * }
 */
app.post('/login', async (req: Request, res: Response): Promise<void> => {
  // Read data from request
  const username: string = req.body.username;
  const password: string = req.body.password;

  // Create database query and data
  const data: [string] = [
    username,
  ];
  const query: string = 'SELECT * FROM user WHERE username = ?;';

  try {
    const [rows]: [RowDataPacket[], FieldPacket[]] = await database.query<RowDataPacket[]>(query, data);

    // Check if database response contains exactly one entry
    if (rows.length !== 1) {
      res.status(401).send({
        message: 'Username or password is incorrect.',
      });
      return;
    }

    // Extract first row into variable.
    const row: RowDataPacket = rows[0];
    const hashCheckResult: boolean = await bcrypt.compare(password, row.password);
    if (hashCheckResult === false) {
      res.status(401).send({
        message: 'Username or password is incorrect.',
      });
      return;
    }

    // Login data is correct, user is logged in
    const user: User = {
      id: row.id,
      givenName: row.givenName,
      familyName: row.familyName,
      creationTime: row.creationTime
    };
    req.session.user = user; // Store user object in session for authentication
    res.status(200).send({
      message: 'Successfully logged in',
      user: user, // Send user object to client for greeting message
    });

  } catch (error: unknown) {
    // Unknown error
    res.status(500).send({
      message: 'Database request failed: ' + error,
    });
  }
});

/**
 * @api {post} /logout Logout user
 * @apiName PostLogout
 * @apiGroup Logout
 *
 * @apiSuccess {string} message Message stating that the user is logged out
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *     "message": "Successfully logged out"
 * }
 */
app.post('/logout', (req: Request, res: Response): void => {
  // Log out user
  req.session.user = null; // Delete user from session
  res.status(200).send({
    message: 'Successfully logged out',
  });
});

/*****************************************************************************
 * HTTP ROUTES: USER, USERS                                                  *
 *****************************************************************************/
/**
 * @api {post} /users Create a new user
 * @apiName postUser
 * @apiGroup Users
 * @apiDescription Send a JSON body. If the database enforces username uniqueness, a duplicate username returns 500.
 *
 * @apiBody {string} username Unique username of the new user
 * @apiBody {string} password Password of the new user
 * @apiBody {string} givenName First name of the user
 * @apiBody {string} familyName Last name of the user
 *
 * @apiSuccess {string} message Message stating the new user has been created successfully
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 201 Created
 * {
 *     "message":"Successfully created new user. ID: 2"
 * }
 *
 * @apiError (400 Bad Request) {String} message One or more required fields are empty or missing.
 *
 * @apiErrorExample {json} NotAllMandatoryFields:
 * HTTP/1.1 400 Bad Request
 * {
 *     "message": "Not all mandatory fields are filled in"
 * }
 *
 * @apiError (401 Unauthorized) {String} message A valid login session is required. Send the session cookie from POST /login.
 *
 * @apiErrorExample {json} SessionNotFound:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message": "User not authorized."
 * }
 *
 * @apiError (500 Internal Server Error) {String} message The database request failed.
 *
 * @apiErrorExample {json} DatabaseRequestFailed:
 * HTTP/1.1 500 Internal Server Error
 * {
 *     "message": "Database request failed: ..."
 * }
 */
app.post('/users', isLoggedIn, async (req: Request, res: Response): Promise<void> => {
  // Read data from request body
  const username: string = req.body.username;
  const password: string = req.body.password;
  const givenName: string = req.body.givenName;
  const familyName: string = req.body.familyName;

  // add a new user if first- and familyName exist
  if (username && password && givenName && familyName) {
    const hashedPassword: string = await bcrypt.hash(password, 10);

    const data: [string, string, string, string, string] = [
      username,
      hashedPassword,
      givenName,
      familyName,
      new Date().toLocaleString()
    ];
    const query: string = 'INSERT INTO user (username, password, givenName, familyName, creationTime) VALUES (?, ?, ?, ?, ?);';
    // Execute database query
    try {
      const [result]: [ResultSetHeader, FieldPacket[]] = await database.query<ResultSetHeader>(query, data);
      res.status(201).send({
        message: `Successfully created new user. ID: ${result.insertId}`,
      });
    } catch (error) {
      // Send response
      res.status(500).send({
        message: 'Database request failed: ' + error,
      });
    }
  } else {
    res.status(400).send({
      message: 'Not all mandatory fields are filled in',
    });
  }
});

/**
 * @api {get} /users/:userId Get user with given id
 * @apiName getUser
 * @apiGroup Users
 *
 * @apiParam {number} userId The id of the requested user
 *
 * @apiSuccess {User} user The requested user object
 * @apiSuccess {string} message Message stating the user has been found
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *     "user":{
 *         "id":1,
 *         "givenName":"Peter",
 *         "familyName":"Kneisel",
 *         "creationTime":"24.09.2022, 12:24:59"
 *     },
 *     "message":"Successfully got user"
 * }
 *
 * @apiError (404 Not Found) {String} message The requested user could not be found.
 *
 * @apiErrorExample {json} NotFound:
 * HTTP/1.1 404 Not Found
 * {
 *     "message":"The requested user can not be found."
 * }
 *
 * @apiError (401 Unauthorized) {String} message A valid login session is required. Send the session cookie from POST /login.
 *
 * @apiErrorExample {json} SessionNotFound:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message": "User not authorized."
 * }
 *
 * @apiError (500 Internal Server Error) {String} message The database request failed.
 *
 * @apiErrorExample {json} DatabaseRequestFailed:
 * HTTP/1.1 500 Internal Server Error
 * {
 *     "message": "Database request failed: ..."
 * }
 */
app.get('/users/:userId', isLoggedIn, async (req: Request, res: Response): Promise<void> => {
  // Read data from request parameters
  const data: [number] = [
    parseInt(req.params.userId as string)
  ];
  // Search user in database
  const query: string = 'SELECT * FROM user WHERE id = ?;';

  try {
    const [rows]: [RowDataPacket[], FieldPacket[]] = await database.query<RowDataPacket[]>(query, data);
    if (rows.length === 1) {
      const user: User = {
        id: rows[0].id,
        givenName: rows[0].givenName,
        familyName: rows[0].familyName,
        creationTime: rows[0].creationTime
      };

      // Send user list to client
      res.status(200).send({
        user: user,
        message: 'Successfully got user',
      });
    } else {
      res.status(404).send({
        message: 'The requested user can not be found.',
      });
    }
  } catch (error) {
    // Database operation has failed
    res.status(500).send({
      message: 'Database request failed: ' + error
    });
  }
});

/**
 * @api {put} /users/:userId Update user with given id
 * @apiName putUser
 * @apiGroup Users
 * @apiDescription Send a JSON body with both names.
 *
 * @apiParam {number} userId The id of the requested user
 * @apiBody {string} givenName The (new) first name of the user
 * @apiBody {string} familyName The (new) last name of the user
 *
 * @apiSuccess {string} message Message stating the user has been updated
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *     "message":"Successfully updated user Selina Kyle"
 * }
 *
 * @apiError (404 Not Found) {String} message The user to update could not be found.
 *
 * @apiErrorExample {json} NotFound:
 * HTTP/1.1 404 Not Found
 * {
 *     "message":"The user to update could not be found"
 * }
 *
 * @apiError (400 Bad Request) {String} message One or more required fields are empty or missing.
 *
 * @apiErrorExample {json} NotAllMandatoryFields:
 * HTTP/1.1 400 Bad Request
 * {
 *     "message": "Not all mandatory fields are filled in"
 * }
 *
 * @apiError (401 Unauthorized) {String} message A valid login session is required. Send the session cookie from POST /login.
 *
 * @apiErrorExample {json} SessionNotFound:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message": "User not authorized."
 * }
 *
 * @apiError (500 Internal Server Error) {String} message The database request failed.
 *
 * @apiErrorExample {json} DatabaseRequestFailed:
 * HTTP/1.1 500 Internal Server Error
 * {
 *     "message": "Database request failed: ..."
 * }
 */
app.put('/users/:userId', isLoggedIn, async (req: Request, res: Response): Promise<void> => {
  // Read data from request
  const userId: number = parseInt(req.params.userId as string);
  const givenName: string = req.body.givenName;
  const familyName: string = req.body.familyName;
  // Check that all arguments are given
  if (givenName && familyName) {
    // Create database query and data
    const data: [string, string, number] = [
      givenName,
      familyName,
      userId
    ];
    const query: string = 'UPDATE user SET givenName = ?, familyName = ? WHERE id = ?;';

    // Execute database query
    try {
      const [result]: [ResultSetHeader, FieldPacket[]] = await database.query<ResultSetHeader>(query, data);

      if (result.affectedRows != 1) {
        res.status(404).send({
          message: 'The user to update could not be found',
        });
      } else {
        res.status(200).send({
          message: `Successfully updated user ${givenName} ${familyName}`,
        });
      }
    } catch (error) {
      res.status(500).send({
        message: 'Database request failed: ' + error
      });
    }
  } else {
    res.status(400).send({
      message: 'Not all mandatory fields are filled in',
    });
  }
});

/**
 * @api {delete} /users/:userId Delete user with given id
 * @apiName deleteUser
 * @apiGroup Users
 *
 * @apiParam {number} userId The id of the requested user
 *
 * @apiSuccess {string} message Message stating the user has been deleted
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *     "message":"Successfully deleted user "
 * }
 *
 * @apiError (404 Not Found) {String} message The user to delete could not be found.
 *
 * @apiErrorExample {json} NotFound:
 * HTTP/1.1 404 Not Found
 * {
 *     "message":"The user to be deleted could not be found"
 * }
 *
 * @apiError (401 Unauthorized) {String} message A valid login session is required. Send the session cookie from POST /login.
 *
 * @apiErrorExample {json} SessionNotFound:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message": "User not authorized."
 * }
 *
 * @apiError (500 Internal Server Error) {String} message The database request failed.
 *
 * @apiErrorExample {json} DatabaseRequestFailed:
 * HTTP/1.1 500 Internal Server Error
 * {
 *     "message": "Database request failed: ..."
 * }
 */
app.delete('/users/:userId', isLoggedIn, async (req: Request, res: Response): Promise<void> => {
  // Read data from request
  const userId: number = parseInt(req.params.userId as string);
  // Delete user
  const query: string = 'DELETE FROM user WHERE id = ?;';
  try {
    const [result]: [ResultSetHeader, FieldPacket[]] = await database.query<ResultSetHeader>(query, userId);
    if (result.affectedRows === 1) {
      res.status(200).send({
        message: `Successfully deleted user `,
      });
    } else {
      res.status(404).send({
        message: 'The user to be deleted could not be found',
      });
    }
  } catch (error) {
    // Database operation has failed
    res.status(500).send({
      message: 'Database request failed: ' + error
    });
  }
});

/**
 * @api {get} /users Get all users
 * @apiName getUsers
 * @apiGroup Users
 * @apiDescription The creationTime field contains a stored date and time string. Its format can vary with the server locale at creation.
 *
 * @apiSuccess {User[]} userList The list of all users
 * @apiSuccess {string} message Message stating the users have been found
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "userList": [
 *      {
 *        "givenName": "Peter",
 *        "familyName": "Kneisel",
 *        "creationTime": "24.09.2022, 12:24:59",
 *        "id": 1
 *      },
 *      {
 *        "givenName": "Bruce",
 *        "familyName": "Wayne",
 *        "creationTime": "04.11.2022, 13:03:18",
 *        "id": 2
 *      }
 *    ],
 *    "message":"Successfully requested user list"
 * }
 *
 * @apiError (401 Unauthorized) {String} message A valid login session is required. Send the session cookie from POST /login.
 *
 * @apiErrorExample {json} SessionNotFound:
 * HTTP/1.1 401 Unauthorized
 * {
 *     "message": "User not authorized."
 * }
 *
 * @apiError (500 Internal Server Error) {String} message The database request failed.
 *
 * @apiErrorExample {json} DatabaseRequestFailed:
 * HTTP/1.1 500 Internal Server Error
 * {
 *     "message": "Database request failed: ..."
 * }
 */
app.get('/users', isLoggedIn, async (req: Request, res: Response): Promise<void> => {
  // Send user list to client
  const query: string = 'SELECT * FROM user;';

  try {
    const [rows]: [RowDataPacket[], FieldPacket[]] = await database.query<RowDataPacket[]>(query);
    // Create local user list to parse users from database
    const userList: User[] = [];
    // Parse every entry
    for (const row of rows) {
      const user: User = {
        id: row.id,
        givenName: row.givenName,
        familyName: row.familyName,
        creationTime: row.creationTime
      };
      userList.push(user);
    }

    // Send user list to client
    res.status(200).send({
      userList: userList,
      message: 'Successfully requested user list'
    });
  } catch (error) {
    // Database operation has failed
    res.status(500).send({
      message: 'Database request failed: ' + error
    });
  }
});

/*****************************************************************************
 * STATIC ROUTES                                                             *
 *****************************************************************************/
app.use(express.static(path.join(__dirname, "..", "..", "client")));
