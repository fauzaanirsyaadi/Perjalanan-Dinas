const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// parse application/json
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');

// create database connection
const db = new sqlite3.Database('db.sqlite3');
// const db = new sqlite3.Database(':memory:');

// create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL
)`);

// add dummy data for users
const users = [
  {
    username: 'sdm',
    password: bcrypt.hashSync('sdm', 10),
    role: 'sdm'
  },
  {
    username: 'pegawai',
    password: bcrypt.hashSync('pegawai', 10),
    role: 'pegawai'
  }
];

// insert dummy data to database
const insertUser = (user) => {
  const { username, password, role } = user;
  db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, password, role], (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`User ${username} added to the database`);
    }
  });
};

db.run(`CREATE TABLE IF NOT EXISTS kota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL UNIQUE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  provinsi TEXT NOT NULL,
  pulau TEXT NOT NULL,
  luar_negeri INTEGER NOT NULL DEFAULT 0
)`);

const cities = [
  {
    nama: 'Jakarta',
    latitude: -6.21462,
    longitude: 106.84513,
    provinsi: 'DKI Jakarta',
    pulau: 'Jawa',
    luar_negeri: 0
  },
  {
    nama: 'Bandung',
    latitude: -6.91746,
    longitude: 107.61912,
    provinsi: 'Jawa Barat',
    pulau: 'Jawa',
    luar_negeri: 0
  },
  {
    nama: 'Surabaya',
    latitude: -7.24917,
    longitude: 112.75083,
    provinsi: 'Jawa Timur',
    pulau: 'Jawa',
    luar_negeri: 0
  },
  {
    nama: 'Bali',
    latitude: -8.40952,
    longitude: 115.18892,
    provinsi: 'Bali',
    pulau: 'Jawa',
    luar_negeri: 0
  },
  {
    nama: 'Singapore',
    latitude: 1.35208,
    longitude: 103.81983,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  },
  {
    nama: 'Hong Kong',
    latitude: 22.396428,
    longitude: 114.109497,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  },
  {
    nama: 'Tokyo',
    latitude: 35.6895,
    longitude: 139.69171,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  },
  {
    nama: 'New York',
    latitude: 40.71278,
    longitude: -74.00594,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  },
  {
    nama: 'London',
    latitude: 51.50735,
    longitude: -0.12776,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  },
  {
    nama: 'Paris',
    latitude: 48.85661,
    longitude: 2.351499,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  },
  {
    nama: 'Dubai',
    latitude: 25.204849,
    longitude: 55.270782,
    provinsi: '',
    pulau: '',
    luar_negeri: 1
  }
]

const insertCity = (city) => {
  const { nama, latitude, longitude, provinsi, pulau, luar_negeri } = city;
  db.run(`INSERT INTO kota (nama, latitude, longitude, provinsi, pulau, luar_negeri) VALUES (?, ?, ?, ?, ?, ?)`, [nama, latitude, longitude, provinsi, pulau, luar_negeri], (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`City ${nama} added to the database`);
    }
  });
};


db.run(`CREATE TABLE IF NOT EXISTS perdin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maksud_tujuan TEXT NOT NULL,
  tanggal_berangkat DATE NOT NULL,
  tanggal_pulang DATE NOT NULL,
  kota_asal_id INTEGER NOT NULL,
  kota_tujuan_id INTEGER NOT NULL,
  durasi INTEGER NOT NULL,
  total_uang INTEGER NULLABLE DEFAULT 0,
  status TEXT NULLABLE DEFAULT 'pending',
  user_id INTEGER NOT NULL,
  FOREIGN KEY (kota_asal_id) REFERENCES kota(id),
  FOREIGN KEY (kota_tujuan_id) REFERENCES kota(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
)`);

// eng point hello world
app.get('/', (req, res) => {
  users.forEach((user) => {
  insertUser(user);
  });

  cities.forEach((city) => {
  insertCity(city);
  });
  // close database connection
  // db.close();

  res.send('Hello World!');
});



// register endpoint
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // insert user to database
  db.run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, role],
    (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send({ error: 'Failed to create user' });
      }

      return res.send({ message: 'User created successfully' });
    }
  );
});

// login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // find user from database
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send({ error: 'Failed to login' });
    }

    if (!row) {
      return res.status(401).send({ error: 'Invalid username or password' });
    }

    // compare password
    const isPasswordMatch = await bcrypt.compare(password, row.password);
    if (!isPasswordMatch) {
      return res.status(401).send({ error: 'Invalid username or password' });
    }

    // generate JWT token
    const token = jwt.sign({ username, role: row.role }, 'secret');
    return res.send({ token });
  });
});

// middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'secret', (err, user) => {
    if (err) {
      return res.status(403).send({ error: 'Forbidden' });
    }

    req.user = user;
    next();
  });
};

// middleware to check if user is sdm
const isSDM = (req, res, next) => {
  if (req.user.role !== 'sdm') {
    return res.status(403).send({ error: 'Forbidden' });

  }
  next();
};

// middleware to check if user is pegawai
const isPegawai = (req, res, next) => {
  if (req.user.role !== 'pegawai') {
    return res.status(403).send({ error: 'Forbidden' });

  }
  next();
};

// only sdm can acces this end point
app.get('/sdm', isAuthenticated, isSDM, (req, res) => {
  res.send({ message: 'Hello sdm' });
});

// only pegawai can acces this end point
app.get('/pegawai', isAuthenticated, isPegawai, (req, res) => {
  // return id user
  res.send({ message: req.user});
});


// endpoint untuk menambahkan kota baru
app.post('/cities', (req, res) => {
  const { nama, latitude, longitude, provinsi, pulau, luar_negeri } = req.body;
  const query = `INSERT INTO kota (nama, latitude, longitude, provinsi, pulau, luar_negeri) VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(query, [nama, latitude, longitude, provinsi, pulau, luar_negeri], function(err) {
    // cek jika data sudah ada 
    if (err && err.code === 'SQLITE_CONSTRAINT') {
      console.log(err.message);
      res.status(400).send('City already exists');
    } else if (err) {
      console.log(err.message);
      res.status(500).send('Internal Server Error');
    } else {
      console.log(`A row has been inserted with rowid ${this.lastID}`);
      res.status(200).send('City added successfully');
    }
  });
});

// endpoint untuk mendapatkan seluruh kota yang tersimpan di database
app.get('/cities', (req, res) => {
  const query = `SELECT * FROM kota`;

  db.all(query, [], function(err, rows) {
    if (err) {
      console.log(err.message);
      res.status(500).send('Internal Server Error');
    } else {
      console.log(rows);
      res.status(200).send(rows);
    }
  });
});

// Endpoint to create new perdin
app.post('/perdin', isAuthenticated, isPegawai, async (req, res) => {
  const { maksud_tujuan, tanggal_berangkat, tanggal_pulang, kota_asal_id, kota_tujuan_id } = req.body;

  // Calculate durasi perdin in days
  const durasi = Math.floor((Date.parse(tanggal_pulang) - Date.parse(tanggal_berangkat)) / (1000 * 60 * 60 * 24)) + 1;

  try {
    // Get user ID from authenticated user
    const user_id = req.user.iat;

    await db.run(`INSERT INTO perdin (maksud_tujuan, tanggal_berangkat, tanggal_pulang, durasi, kota_asal_id, kota_tujuan_id, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`, [maksud_tujuan, tanggal_berangkat, tanggal_pulang, durasi, kota_asal_id, kota_tujuan_id, user_id]);

    const perdin = await db.get(`SELECT * FROM perdin WHERE id = ?`, this.lastID);

    res.status(201).json({
      message : 'Perdin created successfully',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// get all perdin
app.get('/perdin', isAuthenticated, isPegawai, (req, res) => {
  db.all(`SELECT * FROM perdin`, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.json(rows);
  });
});

app.get('/perdin/:id', isAuthenticated, (req, res) => {
  const perdinId = req.params.id;

  db.get(`SELECT * FROM perdin WHERE id = ?`, [perdinId], (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.json(row);
  }
  );
});

app.get('/perdin/:id/biaya', isAuthenticated, (req, res) => {
  const perdinId = req.params.id;

  db.get(`SELECT perdin.*, kota_asal.latitude as latitude_asal, kota_asal.longitude as longitude_asal,
          kota_tujuan.latitude as latitude_tujuan, kota_tujuan.longitude as longitude_tujuan,
          kota_asal.provinsi as provinsi_asal, kota_tujuan.provinsi as provinsi_tujuan,
          kota_asal.pulau as pulau_asal, kota_tujuan.pulau as pulau_tujuan,
          kota_asal.luar_negeri as luar_negeri_asal, kota_tujuan.luar_negeri as luar_negeri_tujuan
          FROM perdin
          INNER JOIN kota as kota_asal ON perdin.kota_asal_id = kota_asal.id
          INNER JOIN kota as kota_tujuan ON perdin.kota_tujuan_id = kota_tujuan.id
          WHERE perdin.id = ?`, [perdinId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'Perdin not found' });
      return;
    }

    const { latitude_asal, longitude_asal, latitude_tujuan, longitude_tujuan, provinsi_asal, provinsi_tujuan, pulau_asal, pulau_tujuan, luar_negeri_asal, luar_negeri_tujuan } = row;

    // Calculate distance between kota_asal and kota_tujuan using Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(latitude_tujuan - latitude_asal);
    const dLon = deg2rad(longitude_tujuan - longitude_asal);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(latitude_asal)) * Math.cos(deg2rad(latitude_tujuan)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Calculate biaya perdin based on distance and other criteria
    let biaya = 0;
    if (distance <= 60) {
      biaya = 0;
    } else if (provinsi_asal === provinsi_tujuan) {
      biaya = 200000 * row.durasi;
    } else if (pulau_asal === pulau_tujuan) {
      biaya = 250000 * row.durasi;
    } else if (luar_negeri_asal || luar_negeri_tujuan) {
      biaya = 50 * row.durasi;
    } else {
      biaya = 300000 * row.durasi;
    }

    db.run(
      // update perdin total_uang
      `UPDATE perdin SET total_uang = ? WHERE id = ?`,
      [biaya, perdinId],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
      }
    )


    res.status(200).json({ biaya: biaya });
  });
});

// Helper function to convert degrees to radians
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Endpoint to reject perdin
app.put('/perdin/:id/reject', isAuthenticated, isSDM, (req, res) => {
  const perdin_id = req.params.id;

  db.run(`UPDATE perdin SET status = 'rejected' WHERE id = ?`, [perdin_id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.status(200).json({
      message: `Perdin with ID ${perdin_id} has been rejected.`
    });
  });
});


// Endpoint to approve perdin
app.put('/perdin/:id/approve', isAuthenticated, isSDM, (req, res) => {
  const perdin_id = req.params.id;

  db.run(`UPDATE perdin SET status = 'approved' WHERE id = ?`, [perdin_id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.status(200).json({
      message: `Perdin with ID ${perdin_id} has been approved.`
    });
  });
});


// start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});