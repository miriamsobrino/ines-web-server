import express from 'express';
import { config } from 'dotenv';
import connectDB from './config/db.js';
import User from './models/user.js';
import Article from './models/article.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import admin from 'firebase-admin';
import serviceAccount from './config/serviceAccount.js';

config();
connectDB();

const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    type: serviceAccount.type,
    project_id: serviceAccount.project_id,
    private_key_id: serviceAccount.private_key_id,
    private_key: privateKey,
    client_email: serviceAccount.client_email,
    client_id: serviceAccount.client_id,
    auth_uri: serviceAccount.auth_uri,
    token_uri: serviceAccount.token_uri,
    auth_provider_x509_cert_url: serviceAccount.auth_provider_x509_cert_url,
    client_x509_cert_url: serviceAccount.client_x509_cert_url,
  }),
  storageBucket: 'gs://ines-web-f0de7.appspot.com',
});

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
const upload = multer();
// const storage = multer.memoryStorage();
//const upload = multer({ storage });
app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).send('Credenciales incorrectas');
    }
    const token = jwt.sign({ username, id: user._id }, process.env.SECRET, {
      expiresIn: '1h',
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60,
      })
      .json({ message: 'Inicio de sesión exitoso' });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).send('Error interno del servidor');
  }
});
app.get('/verify-token', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Failed to authenticate token' });
    }

    res.json({ username: decoded.username, id: decoded.id });
  });
});

app.post('/logout', (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    })
    .json({ message: 'Logged out successfully' });
});
app.post('/articles', async (req, res) => {
  try {
    const { title, summary, content, file } = req.body;

    if (!title || !summary || !content || !file) {
      return res.status(400).json({
        message: 'Falta el archivo o alguno de los campos obligatorios.',
      });
    }
    const article = await Article.create({
      title,
      summary,
      content,
      file: file,
    });

    res.json(article);
  } catch (error) {
    console.error('Error al crear artículo:', error);
    res.status(500).json({ message: 'Error al crear artículo.' });
  }
});
app.get('/articles', async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.status(200).json(articles);
  } catch (error) {
    console.error('Error al obtener los artículos:', error.message);
    res.status(500).send('Error interno del servidor');
  }
});

app.get('/articles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    res.status(200).json(article);
  } catch (error) {
    console.error('Error al obtener el artículo por ID:', error.message);
    res.status(500).send('Error interno del servidor');
  }
});

app.put('/articles/:id', upload.none(), async (req, res) => {
  const { id } = req.params;
  const { title, summary, content } = req.body;

  try {
    const updateData = {
      title,
      summary,
      content,
    };

    const updatedArticle = await Article.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedArticle) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    res.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error.message);
    res.status(500).send('Error updating article');
  }
});

app.delete('/articles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const article = await Article.findByIdAndDelete(id);

    if (!article) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    res.json({ message: 'Artículo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el artículo:', error.message);
    res.status(500).send('Error interno del servidor');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
