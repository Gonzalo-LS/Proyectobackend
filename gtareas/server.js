const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


const db = new Pool({
  connectionString: 'postgresql://postgres:ZUAMRXVRfaWDwBUnugxvAdGYubucBDys@autorack.proxy.rlwy.net:56724/railway',
  ssl: { rejectUnauthorized: false },
});


db.connect((err) => {
  if (err) {
    console.error('Error conectando a PostgreSQL:', err);
  } else {
    console.log('Conectado a PostgreSQL');
  }
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM usuarios WHERE username = $1', [username], (err, result) => {
    if (err) {
      console.error('Error ejecutando consulta:', err);
      return res.status(500).json({ message: 'Error del servidor' });
    }
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparando contraseña:', err);
        return res.status(500).json({ message: 'Error del servidor' });
      }
      if (!isMatch) {
        return res.status(400).json({ message: 'Contraseña incorrecta' });
      }

      const token = jwt.sign({ id: user.id, rol: user.rol }, 'Password!123', { expiresIn: '24h' });
      res.json({ token, role: user.rol });
    });
  });
});


app.get('/tareas', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  jwt.verify(token, 'Password!123', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    if (decoded.rol === 'admin') {
      db.query(
        `SELECT 
          tareas.id, 
          tareas.titulo, 
          tareas.descripcion, 
          tareas.estado, 
          tareas.usuario_id, 
          usuarios.username AS asignado_a 
        FROM tareas 
        LEFT JOIN usuarios ON tareas.usuario_id = usuarios.id`,
        (err, result) => {
          if (err) {
            console.error('Error obteniendo tareas:', err);
            return res.status(500).json({ message: 'Error del servidor' });
          }
          res.json(result.rows);
        }
      );
    } else if (decoded.rol === 'normal') {
      db.query(
        `SELECT 
          id, 
          titulo, 
          descripcion, 
          estado 
        FROM tareas 
        WHERE usuario_id = $1`,
        [decoded.id],
        (err, result) => {
          if (err) {
            console.error('Error obteniendo tareas:', err);
            return res.status(500).json({ message: 'Error del servidor' });
          }
          res.json(result.rows);
        }
      );
    } else {
      res.status(403).json({ message: 'Rol no permitido' });
    }
  });
});


app.post('/tareas', (req, res) => {
  const { titulo, descripcion, usuario_id } = req.body;
  const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
   console.log('Token recibido:', token);

  if (!token) return res.status(403).json({ message: 'No autorizado' });

  jwt.verify(token, 'Password!123', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Acceso denegado' });

console.log('Token decodificado:', decoded); 
    
    if (decoded.rol !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    db.query(
      'INSERT INTO tareas (titulo, descripcion, usuario_id) VALUES ($1, $2, $3)',
      [titulo, descripcion, usuario_id],
      (err, result) => {
        if (err) {
          console.error('Error creando tarea:', err);
          return res.status(500).json({ message: 'Error del servidor' });
        }
        res.status(201).json({ message: 'Tarea creada exitosamente' });
      }
    );
  });
});


app.patch('/tareas/:id', (req, res) => {
  const { id } = req.params;
  const token = req.headers['authorization'];

  if (!token) return res.status(403).json({ message: 'No autorizado' });

  jwt.verify(token, 'Password!123', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Acceso denegado' });

    db.query(
      'UPDATE tareas SET estado = $1 WHERE id = $2 AND usuario_id = $3',
      ['completada', id, decoded.id],
      (err, result) => {
        if (err) {
          console.error('Error marcando tarea como completada:', err);
          return res.status(500).json({ message: 'Error del servidor' });
        }
        if (result.rowCount === 0) {
          return res.status(404).json({ message: 'Tarea no encontrada o no autorizada' });
        }
        res.json({ message: 'Tarea marcada como completada' });
      }
    );
  });
});


app.delete('/tareas/:id', (req, res) => {
  const { id } = req.params;
  const token = req.headers['authorization'];

  if (!token) return res.status(403).json({ message: 'No autorizado' });

  jwt.verify(token, 'Password!123', (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Acceso denegado' });

    if (decoded.rol !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    db.query('DELETE FROM tareas WHERE id = $1', [id], (err, result) => {
      if (err) {
        console.error('Error eliminando tarea:', err);
        return res.status(500).json({ message: 'Error del servidor' });
      }
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Tarea no encontrada' });
      }
      res.json({ message: 'Tarea eliminada exitosamente' });
    });
  });
});

app.listen(3000, () => {
  console.log('Servidor corriendo en el puerto 3000');
});
