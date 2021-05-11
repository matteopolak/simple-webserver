import dotenv from 'dotenv';
import fastify from 'fastify';
import { MongoClient } from 'mongodb';

/**
 * This interface (named "LeaderboardEntry") is used to show
 * the type of content contained in each leaderboard entry
 * once we fetch them from the database.
 */
interface LeaderboardEntry {
	name: string;
	score: number;
}

// Set .env file variables as environment variables
dotenv.config();

/**
 * Create a new MongoDB client connection.
 * 
 * The object "process.env" contains all environment
 * variables on the machine that it's running on.
 * 
 * In this case, "dotenv.config()" overwrites some
 * of them with the ones I have in my local file
 * named ".env". This is good practice as it doesn't let
 * you (the one reading this from the public GitHub
 * repository that this was uploaded to) see my login
 * information in plain text.
 */
const connection = new MongoClient(process.env.MONGO_URL!, { useNewUrlParser: true, useUnifiedTopology: true });

// Create a new instance of the Fastify webserver
const server = fastify();

/**
 * (async () => {})(): What is it?
 * 
 * This creates a function with no name, and runs it immediately.
 * Node.js doesn't have top-level await in versions under 14.0.0,
 * so using it isn't a great idea as it's very new.
 * 
 * If you DO want to use it, you can remove this function and place
 * everything outside. Just make sure to run the program with the
 * "--experimental-top-level-await" flag.
 */
(async () => {
	// Wait for the connection to MongoDB...
	await connection.connect();

	// In the database "example", get the collection (if you know SQL, this is a table) named "leaderboard"
	const leaderboard = connection.db('example').collection('leaderboard');

	/**
	 * Create a new API route at /leaderboard, accepting a GET
	 * request. This will return the top players on the leaderboard,
	 * which will then be shown in-game
	 */
	server.get('/leaderboard', async () => {

		// Use all documents, sorted by their score, get the first 10, then return them in an array
		const board: LeaderboardEntry[] = await leaderboard
			.find({}, { projection: { _id: 0 } })
			.sort({ score: -1 })
			.limit(10)
			.toArray();

		/**
		 * Return the board.
		 * 
		 * You can also return the board directly from the function above,
		 * without creating a new variable. However, I have done it this
		 * way for clarity, so you know what's happening when I'm
		 * finding and sorting the documents.
		 */
		return { result: board };
	});

	/**
	 * Create a new API route at /leaderboard, accepting a PUT
	 * request. This will be used to submit a new score to
	 * the leaderboard database
	 */
	server.put('/leaderboard', async ({ body }: { body: any }) => {
		/**
		 * If the body isn't right, we don't want it. This will never
		 * happen under normal circumstances. But, if someone finds the
		 * route of our API, then we'll need to make sure they're valid.
		 * 
		 * Of course, that would be a much bigger issue, as they would
		 * be able to submit invalid scores.
		 */
		if (body === null || typeof body.name !== 'string' || typeof body.score !== 'number') {

			// Return a message to show that the request was not successful
			throw {
				statusCode: 400,
				error: 'Bad Request',
				message: 'Invalid body'
			};
		}

		// Insert the name and score into the leaderboard database
		await leaderboard.insertOne({
			name: body.name,
			score: body.score
		});

		// Return a message to show that the request was successful
		return {
			statusCode: 200,
			message: 'Your score has been posted'
		};
	});

	// Start listening on port 2000
	server.listen(2000, (_, address) => {
		return console.log(`[ Online ] Listening on ${address}`);
	});
})();