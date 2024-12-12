const express = require('express');
const bodyParser = require('body-parser');
const connection = require('./db');
const app = express();

// Configuración
app.set('view engine', 'ejs');
app.set('views', './views'); // Asegura la carpeta correcta para las vistas
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));


// Rutas
// Ruta principal: mostrar productos
app.get('/', (req, res) => {
  connection.query('SELECT * FROM productos', (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en el servidor');
    } else {
      res.render('index', { productos: results });
    }
  });
});

// Ruta para agregar un producto
app.post('/agregar', (req, res) => {
  const { nombre, categoria, precio, cantidad, descripcion } = req.body;
  const query = 'INSERT INTO productos (nombre, categoria, precio, cantidad, descripcion) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [nombre, categoria, precio, cantidad, descripcion], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al agregar producto');
    } else {
      res.redirect('/');
    }
  });
});

// Ruta para editar un producto (mostrar formulario)
app.get('/editar/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM productos WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error en el servidor');
    } else {
      res.render('editar', { producto: results[0] });
    }
  });
});

// Ruta para actualizar un producto
app.post('/editar/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, categoria, precio, cantidad, descripcion } = req.body;
  const query = `
    UPDATE productos 
    SET nombre = ?, categoria = ?, precio = ?, cantidad = ?, descripcion = ? 
    WHERE id = ?`;
  connection.query(query, [nombre, categoria, precio, cantidad, descripcion, id], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al actualizar producto');
    } else {
      res.redirect('/');
    }
  });
});

// Ruta para borrar un producto
app.post('/borrar/:id', (req, res) => {
    const { id } = req.params;
  
    // Primero, eliminar las ventas asociadas a este producto
    const deleteVentasQuery = 'DELETE FROM ventas WHERE producto_id = ?';
    connection.query(deleteVentasQuery, [id], (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al eliminar ventas asociadas');
      } else {
        // Luego, eliminar el producto
        const deleteProductoQuery = 'DELETE FROM productos WHERE id = ?';
        connection.query(deleteProductoQuery, [id], (err) => {
          if (err) {
            console.error(err);
            res.status(500).send('Error al borrar el producto');
          } else {
            res.redirect('/');
          }
        });
      }
    });
  });

  
// Ruta para mostrar el historial de ventas
app.get('/ventas', (req, res) => {
  const ventasQuery = `
    SELECT ventas.id, ventas.cliente, productos.nombre AS producto_nombre, ventas.cantidad, ventas.fecha
    FROM ventas
    JOIN productos ON ventas.producto_id = productos.id`;
  connection.query(ventasQuery, (err, ventas) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al cargar las ventas');
    } else {
      res.render('ventas', { ventas }); // Renderiza el historial
    }
  });
});

// Ruta para mostrar el formulario de registrar nueva venta
app.get('/ventas/nueva', (req, res) => {
  const query = 'SELECT * FROM productos';
  connection.query(query, (err, productos) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al cargar los productos');
    } else {
      res.render('formulario_venta', { productos }); // Renderiza el formulario
    }
  });
});

// Ruta para registrar una nueva venta
app.post('/ventas', (req, res) => {
  const { cliente, producto_id, cantidad } = req.body;

  // Verificar el inventario
  const checkStockQuery = 'SELECT cantidad FROM productos WHERE id = ?';
  connection.query(checkStockQuery, [producto_id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al verificar el inventario');
    } else if (results[0].cantidad < cantidad) {
      res.status(400).send('Cantidad insuficiente en el inventario');
    } else {
      // Registrar la venta
      const insertVentaQuery = 'INSERT INTO ventas (cliente, producto_id, cantidad) VALUES (?, ?, ?)';
      connection.query(insertVentaQuery, [cliente, producto_id, cantidad], (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error al registrar la venta');
        } else {
          // Actualizar el inventario
          const updateStockQuery = 'UPDATE productos SET cantidad = cantidad - ? WHERE id = ?';
          connection.query(updateStockQuery, [cantidad, producto_id], (err) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error al actualizar el inventario');
            } else {
              res.redirect('/ventas');
            }
          });
        }
      });
    }
  });
});

// Ruta para editar un producto (mostrar formulario)
app.get('/editar/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM productos WHERE id = ?';
    connection.query(query, [id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error en el servidor');
      } else if (results.length === 0) {
        res.status(404).send('Producto no encontrado');
      } else {
        res.render('editar', { producto: results[0] });
      }
    });
  });
  

  // Ruta para borrar un producto
app.post('/borrar/:id', (req, res) => {
    const { id } = req.params;
  
    // Verificar si el producto tiene ventas asociadas
    const checkVentasQuery = 'SELECT COUNT(*) AS ventas_count FROM ventas WHERE producto_id = ?';
    connection.query(checkVentasQuery, [id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al verificar las ventas');
      } else if (results[0].ventas_count > 0) {
        res.status(400).send('No puedes eliminar un producto que tiene ventas asociadas');
      } else {
        // Si no hay ventas, proceder con la eliminación del producto
        const deleteProductoQuery = 'DELETE FROM productos WHERE id = ?';
        connection.query(deleteProductoQuery, [id], (err) => {
          if (err) {
            console.error(err);
            res.status(500).send('Error al borrar el producto');
          } else {
            res.redirect('/');
          }
        });
      }
    });
  });
  

  

// Servidor escuchando
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
