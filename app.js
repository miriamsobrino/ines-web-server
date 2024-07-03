import express from 'express';
import { config } from 'dotenv';
import connectDB from './config/db.js';
import User from './models/user.js';
import Article from './models/article.js';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
const uploadMiddleware = multer({ dest: 'uploads/' });

config();
connectDB();
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
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

const saveArticle = async () => {
  try {
    const newArticle = new Article({
      title: 'Como mejorar el seo',
      content: 'akjshfjkashfjkahdfjkahdkjfh',
    });

    const savedArticle = await newArticle.save();
  } catch (err) {
    console.error('Error al guardar el artículo', err.message);
  }
};

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
        sameSite: 'strict',
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
app.post('/articles', uploadMiddleware.single('file'), async (req, res) => {
  const originalName = req.file.originalname;
  const pathFile = req.file.path.replace(/\\/g, '/');
  const part = originalName.split('.');
  const ext = part[part.length - 1];
  const newPath = pathFile + '.' + ext;
  fs.renameSync(pathFile, newPath);

  const { title, summary, content } = req.body;
  const articleItem = await Article.create({
    title,
    summary,
    content,
    file: newPath,
  });

  res.json(articleItem);
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

app.put('/articles/:id', uploadMiddleware.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title, summary, content } = req.body;
  const updatedData = { title, summary, content };

  let newPath = null;
  if (req.file) {
    const originalName = req.file.originalname;
    const pathFile = req.file.path.replace(/\\/g, '/');
    const part = originalName.split('.');
    const ext = part[part.length - 1];
    newPath = pathFile + '.' + ext;
    fs.renameSync(pathFile, newPath);
    updatedData.file = newPath;
  }

  try {
    const article = await Article.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    console.log('Updated article:', article);

    if (!article) {
      return res.status(404).json({ message: 'Artículo no encontrado' });
    }

    res.json(newPath);
  } catch (error) {
    console.error('Error al obtener el artículo por ID:', error.message);
    res.status(500).send('Error interno del servidor');
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
