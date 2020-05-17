const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const app = express();
var ID = 9;
const DBNAME = "facebook_clone.db";
const cors = require("cors");
app.use(cors());
app.use(express.json());

const requestLogger = (request, response, next) => {
	console.log("Method:", request.method);
	console.log("Path:  ", request.path);
	console.log("Body:  ", request.body);
	console.log("---");
	next();
};
app.use(requestLogger);

const profilePictureStorage = multer.diskStorage({
	destination: '../sociallife_frontend/public/images/profilePictures',
	filename: function (req, file, callback) {
		callback(null,"profile_picture_"+ID.toString()+ path.extname(file.originalname))
	}
});

const postPictureStorage = multer.diskStorage({
	destination: 'images/postpics',
	filename: function (req, file, callback) {
		crypto.pseudoRandomBytes(16, function(err, raw) {
			if (err) return callback(err);
		  
			callback(null, raw.toString('hex') + path.extname(file.originalname));
		  });
	}
});

const profilePictureUpload = multer ({
	storage: profilePictureStorage
});

app.get("/", (request, response) => {
	response.send("<h1>Welcome to swista</h1>");
	console.log(ID);
});

app.post("/upload/profilepicture", profilePictureUpload.single("profilePicture"), (request, response) => {
	if(!request.file){
		console.log("No file received");
		const db = new sqlite3.Database(DBNAME);
		db.get("select gender from user_data where ID = ?",
		ID,
		(err,result)=>{
			if(result.gender === "Male"){
				db.run("update user_data set profile_picture = 'male.png' where ID = ?",
				ID
				);
			}else{
				db.run("update user_data set profile_picture = 'female.png' where ID = ?",
				ID
				);
			}
			db.close();
			response.send("default image inserted");
		})
	}
	else{
		response.send(request.file);
		const db = new sqlite3.Database(DBNAME);
		db.run("update user_data set profile_picture = ? where ID = ?",
		request.file.filename,
		ID
		);
		db.close();
	}
})

app.post("/login", (request, response) => {
	const body = request.body;
	const db = new sqlite3.Database(DBNAME);

	db.get(
		"select password, ID from user_authentication where Email = (?)",
		body.Email,
		(error, result) => {
			db.close();
			if (result) {
				if (bcrypt.compareSync(body.password, result.password)) {
					ID = result.ID;
					db.get(
						"select * from user_data where ID  = ?",
						result.ID,
						(err, res) => {
							response.status(200);
							response.send(res);
						}
					);
				}
			} else {
				response.status(401);
				response.send({ error: "Wrong Credentials!" });
			}
		}
	);
});

app.post("/signUp", (request, response) => {
	const body = request.body;
	const db = new sqlite3.Database(DBNAME);
	const hashPass = bcrypt.hashSync(body.password, 10);

	db.run(
		"INSERT INTO user_authentication (Email,password) VALUES ((?),(?))",
		body.Email,
		hashPass,
		(error, result) => {
			if (!error) {
				db.run(
					"INSERT INTO user_data (Fname,Lname,phone_number,gender,DOB,profile_picture,home_town,marital_status,about_me) VALUES ((?),(?),(?),(?),(?),(?),(?),(?),(?))",
					body.Fname,
					body.Lname,
					body.phone_number,
					body.gender,
					body.DOB,
					body.profile_picture,
					body.home_town,
					body.marital_status,
					body.about_me
				);
				db.each(
					"select ID from user_authentication where Email = (?) and password = (?)",
					body.Email,
					hashPass,
					(error, result) => {
						ID = result.ID;
						db.get(
							"select * from user_data where ID  = ?",
							result.ID,
							(err, res) => {
								response.status(200);
								response.send(res);
							}
						);
					}
				);
			}
		}
	);
	db.close();
	
});

app.post("/posts/public", (request, response) => {
	const db = new sqlite3.Database(DBNAME);
	const body = request.body;
	const time = new Date().toISOString();
	db.run(
		"insert into public_post(text_content, image_content, time, posted_by) values(?, ? ,?, ?)",
		body.text_content,
		"image placeholder",
		time,
		ID,
		(err, result) => {
			console.log(result);
		}
	);

	db.close();
});

app.post("/posts/private", (request, response) => {
	const db = new sqlite3.Database(DBNAME);
	const body = request.body;
	const time = new Date().toISOString;
	db.run(
		"insert into private_post(text_content, image_content, time, posted_by) values(?, ? ,?, ?)",
		body.text_content,
		"image placeholder",
		time,
		ID,
		(err, result) => {
			console.log(result);
		}
	);

	db.close();
});

app.put("/profile/edit", (request, response) => {
	const db = new sqlite3.Database(DBNAME);
	const body = request.body;
	db.run(
		"update user_data set Fname = ?,Lname = ?,phone_number = ?,gender = ?,DOB = ?,profile_picture = ?,home_town = ?,marital_status = ?,about_me = ? where ID = ?",
		body.Fname,
		body.Lname,
		body.phone_number,
		body.gender,
		body.DOB,
		body.profile_picture,
		body.home_town,
		body.marital_status,
		body.about_me,
		ID
	);
	db.close();
});

app.get("/user/:id/info", (request, response) => {
	const db = new sqlite3.Database(DBNAME);
	const requestedID = Number(request.params.id);

	db.get(
		"select Fname, Lname, profile_picture from user_data where ID = ?",
		requestedID,
		(err, result) => {
			response.status(200).json(result);
		}
	);
});

app.get("/user/friend", (request,response)=>{
	const db = new sqlite3.Database(DBNAME);
	db.all("SELECT Fname , Lname , ID FROM user_data ,(select userfriend_ID from friend where user_ID = ?  union select user_ID from friend where userfriend_ID  = ?) where userfriend_ID = ID",
	ID,
	ID,
	(error,friendList)=>{
		response.send(friendList);
	})
})

app.get("/user/friendRequest", (request,response)=>{
	const db = new sqlite3.Database(DBNAME);
	db.all("SELECT Fname , Lname , ID FROM user_data ,(select sender_ID from friend_request where reciever_ID = ?) where sender_ID = ID",
	ID,
	(error,friendRequestList)=>{
		response.send(friendRequestList);
	})
})

app.get("/user/:id", (request, response) => {
	const requestedID = Number(request.params.id);
	const db = new sqlite3.Database(DBNAME);
	db.get("select * from user_data where id = ?", requestedID, (err, user) => {
		db.get(
			"select userfriend_ID from friend where user_ID = ? and userfriend_ID = ? UNION select user_ID from friend where userfriend_ID = ? and user_ID = ?",
			ID,
			requestedID,
			ID,
			requestedID,
			(err, isFriend) => {
				db.close();
				const requestedUserData = {
					Fname: user.Fname,
					Lname: user.Lname,
					phoneNumber: user.phone_number,
					gender: user.gender,
					profilePicture: user.profile_picture,
					homeTown: user.home_town,
					maritalStatus: user.marital_status,
				};
				if (isFriend || requestedID === ID) {
					db.all(
						"select * from private_post where posted_by = ? union select * from public_post where posted_by = ? order by time desc",
						requestedID,
						requestedID,
						(err, posts) => {
							return response.status(200).json({
								userData: {
									...requestedUserData,
									aboutMe: user.about_me,
									DOB: user.DOB,
								},
								posts: posts,
								friendshipState: 0,
							});
						}
					);
				} else {
					db.get(
						"select * from friend_request where sender_ID = ? and reciever_ID = ? or sender_ID = ? and reciever_ID = ?",
						ID,
						requestedID,
						requestedID,
						ID,
						(err, result) => {
							db.all(
								"select * from public_post where posted_by = ? order by time desc",
								requestedID,
								(err, posts) => {
									return response.status(200).json({
										userData: { ...requestedUserData },
										posts: posts,
										friendshipState:
											result === undefined
												? 1
												: result.sender_ID === ID
												? 2
												: 3,
									});
								}
							);
						}
					);
				}
			}
		);
	});
});

app.post("/user/:id/acceptFriendRequest", (request, response) => {
	const requestedID = request.params.id;
	const db = new sqlite3.Database(DBNAME);
	db.run(
		"delete from friend_request where sender_ID = ? and reciever_ID  = ?",
		requestedID,
		ID,(err, result) => {
			db.run(
				"insert into friend(user_ID,userfriend_ID) values(?,?)",
				requestedID,
				ID,
				(err,result) => {
					response.status(200).send({})
				}
			);
		}
	);
});

app.post("/user/:id/sendFriendRequest", (request, response) => {
	const requestedID = request.params.id;
	const db = new sqlite3.Database(DBNAME);
	db.run(
		"insert into friend_request(sender_ID,reciever_ID) values(?,?)",
		ID,
		requestedID,
		(err,result) => {
			response.status(200).send({})
		}
	);
});

app.delete("/user/:id/deleteFriendRequest", (request, response) => {
	const requestedID = request.params.id;
	const db = new sqlite3.Database(DBNAME);
	db.run(
		"delete from friend_request where sender_ID = ? and reciever_ID  = ? or sender_ID = ? and reciever_ID = ?",
		requestedID,
		ID,
		ID,
		requestedID,
		(err,result) => {
			response.status(200).send({})
		}
	);
});

app.delete("/user/:id/unfriend", (request, response) => {
	const requestedID = request.params.id;
	const db = new sqlite3.Database(DBNAME);
	db.run(
		"delete from friend where user_ID = ? and userfriend_ID  = ? or user_ID = ? and userfriend_ID = ?",
		requestedID,
		ID,
		ID,
		requestedID,
		(err,result) => {
			response.status(200).send({})
		}
	);
});

app.get("/homePage", (request, response) => {
	const db = new sqlite3.Database(DBNAME);
	db.all(
		"SELECT post_ID, text_content, image_content,time,posted_by FROM private_post ,(select userfriend_ID from friend where user_ID = ?  union select user_ID from friend where userfriend_ID  = ?) where posted_by = userfriend_ID  UNION SELECT * FROM public_post union select * from private_post where posted_by = ? order by time desc",
		ID,
		ID,
		ID,
		(error, result) => {
			response.send(result);
		}
	);
});

app.get("/search/:searchType/:key", (request,response)=>{	
	const searchType = Number(request.params.searchType);
	var key = request.params.key;
	const db = new sqlite3.Database(DBNAME);
	switch(searchType){
		case 1:
			const name = decodeURI(key).split(" ")
			db.all("select Fname, Lname, ID from user_data where Fname = ? and Lname  = ?",
			name[0],
			name[1],
			(error,result)=>{
				return response.send(result);
			})
			break;
		case 2:
			db.all("select Fname, Lname, ID from user_data natural join user_authentication where Email = ?",
			key,
			(error,result)=>{
				return response.send(result);
			})
			break;
		case 3:
			db.all("select Fname, Lname, ID from user_data where phone_number = ?",
			key,
			(error,result)=>{
				return response.send(result);
			})
			break;
		case 4:
			db.all("select Fname, Lname, ID from user_data where home_town = ?",
			key,
			(error,result)=>{
				return response.send(result);
			})
			break;
		case 5:
			key = `%${key}%`;
			console.log(key);
			db.all(`SELECT * FROM (SELECT post_ID, text_content, image_content,time,posted_by FROM private_post ,(select userfriend_ID from friend where user_ID = ?  union select user_ID from friend where userfriend_ID  = ?) where posted_by = userfriend_ID  UNION SELECT * FROM public_post union select * from private_post where posted_by = ?) WHERE text_content like ? order by time desc `,
			ID,
			ID,
			ID,
			key,
			(error,result)=>{
				return response.send(result);
			})
			break;
			default:
				return response.status(404)
	}
	
})


const PORT = 3001;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
