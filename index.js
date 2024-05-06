// Serverio logika

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const validator = require('validator');
const fs = require('fs');

const jwtSecret = process.env.JWT_SECRET;
const app = express();
const PORT = process.env.PORT || 5500;

//favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));

//MongoDB prijungimas
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {}
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('Listening on port ${PORT}');
  });
});

// MongoDB Modeliai
const Post = mongoose.model(
  'Post',
  new mongoose.Schema({
    title: String,
    content: String,
    imageUrl: String,
    author: String,
    timestamp: String,
  })
);
// MongoDB Modeliai
const User = mongoose.model(
  'User',
  new mongoose.Schema({
    username: String,
    password: String,
    role: String,
  })
);

// Tarpininkas kodams
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

//JWT autentifikacijos tarpininkas

const authenticateJWT = (req, res, next) => {
  const token = req.headers.autherization.split(' ')[1];

  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.log('JWT verification Error', err.message);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    console.log('Token is missing');
    res.sendStatus(401);
  }
};

// Vartotoju registracija
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  // Patikrinama jog vartotojo ivesti duomenis yra teisingi, bei apsaugojama duombaze nuo js kodu ivedimo i ja.
  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(username);

  //Tikrinama ar ivesti duomenis yra teisingi

  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: 'Invalid input data' });
  }

  const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);

  const newUser = new User({
    username: sanitizedUsername,
    password: sanitizedPassword,
    role,
  });

  await newUser.save();
  res.status(201).send({ success: true });
});

//Vartotoju prisijungimas
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Patikrinama jog vartotojo ivesti duomenis yra teisingi, bei apsaugojama duombaze nuo js kodu ivedimo i ja.
  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(username);

  //Tikrinama ar ivesti duomenis yra teisingi

  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: 'Invalid input data' });
  }

  const user = await User.findOne({ username: sanitizedUsername });

  if (user) {
    if (bcrypt.compare(password, user.password)) {
      const accessToken = jwt.sign(
        {
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '24h',
        }
      );
      res
        .status(200)
        .send({ success: true, token: accessToken, role: user.role });
    } else {
      res.status(401).send({ success: false });
    }
  } else {
    res.status(401).send({ success: false }); //Jeigu vartotojas neegzistuoja, tuomet yra siunciamas pranesimas, kad nepavyko.
  }
});

// Blog'u postu skaitymas
app.get('/posts', async (req, res) => {
  const posts = await Post.find();
  res.status(200).send(posts);
});

app.post('/posts', authenticateJWT, async (req, res) => {
  if (req.user.role === 'admin') {
    const { title, content, imageUrl, author, timestamp } = req.body;

    const newPost = new Post({
      title,
      content,
      imageUrl,
      author,
      timestamp,
    });
    newPost
      .save()
      .then((savedPost) => {
        res.status(201).send(savedPost);
      })
      .catch((error) => {
        res.status(500).send({ error: 'Vidinis serverio gedimas' });
      });
  } else {
    res.sendStatus(403);
  }
});

app.get('/post:id', async (req, res) => {
  const postId = req.params.id;
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(400).send('Irasas nerastas');
  }

  // Nuskaityti HTML is failo
  fs.readFile(path.join(__dirname, 'post-detail.html'), 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Vidinis serverio gedimas');
    }

    // Pakeisti HTML faile esancius kintamuosius i informacija
    const postDetailHtml = data
      .replace(/\${post.imageUrl}/g, post.imageUrl)
      .replace(/\${post.title}/g, post.title)
      .replace(/\${post.timestamp}/g, post.timestamp)
      .replace(/\${post.author}/g, post.author)
      .replace(/\${post.content}/g, post.content);

    res.status(200).send(postDetailHtml);
  });
});
