const express = require('express');
const app = express();
const ejs = require('ejs');
const port = 3000;
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const session = require('express-session');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: "secret", resave: false, saveUninitialized: false, }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


function isProductInCart(cart, id) {
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id == id) {
            return true;
        }
    }
    return false;
}
function calculateTotal(cart, req) {
    total = 0;
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].sale_price) {
            total += cart[i].sale_price * cart[i].quantity;
        } else {
            total += cart[i].price * cart[i].quantity;
        }
    }
    req.session.total = total;
    return total;
}
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project"
});

connection.connect((error) => {
    if (error) {
        console.error('Error connecting to the database: ', error);
    } else {
        console.log('Connected to the database');
    }
});

// Home page
app.get('/', async (req, res) => {
    // Fetch products from the database
    connection.query('SELECT * FROM products', (error, results) => {
        if (error) {
            console.error('Error fetching products: ', error);
            res.status(500).send('Internal Server Error');
        } else {
            res.render('pages/index', { products: results });
        }
    });
});

app.post('/add_to_cart', function (req, res) {
    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var sale_price = req.body.sale_price;
    var quantity = req.body.quantity;
    var image = req.body.image;
    var product = { id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image };
  
    var cart = req.session.cart || []; // Initialize cart array if it doesn't exist
  
    // Check if product already exists in cart
    var existing_product = cart.find(function (item) {
      return item.id === id;
    });
  
    if (existing_product) {
      // Increment quantity if product already exists in cart
      existing_product.quantity += parseInt(quantity);
    } else {
      // Add new product to cart if it doesn't exist
      cart.push(product);
    }
  
    req.session.cart = cart;
    calculateTotal(cart, req); // Calculate total
    res.redirect('/cart');
  });

app.get('/cart', (req, res) => {
    let cart = req.session.cart;
    let total = req.session.total;
    res.render('pages/cart', { cart: cart, total: total });
}
);

app.post('/remove_product', function (req, res) {
    var id = req.body.id;
    var cart = req.session.cart;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id === id) {
            cart.splice(cart.indexOf(i), 1);
        }
    }
    //recalculate
    calculateTotal(cart, req);
    res.redirect('/cart');

});

app.post('/edit_product_qauntity', function (req, res) {

    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity_btn;
    var decrease_btn = req.body.decrease_product_quantity_btn;


    var cart = req.session.cart;

    if (increase_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {

                if (cart[i].quantity > 0) {
                    cart[i].quantity = parseInt(cart[i].quantity) + 1;
                }
            }
        }
    }

    if (decrease_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id === id) {

                if (cart[i].quantity > 1) {
                    cart[i].quantity = parseInt(cart[i].quantity) - 1;
                }
            }
        }
    }
    calculateTotal(cart, req);
    res.redirect('/cart');
})

app.get('/checkout', function (req, res) {
    var total = req.session.total;
    res.render('pages/checkout', { total: total })
})

app.post('/place_order', function (req, res) {
    var cost = req.session.total;
    var name = req.body.name;
    var email = req.body.email;
    var status = "not paid";
    var city = req.body.city;
    var address = req.body.address;
    var phone = req.body.phone;
    var date = new Date();
    var products_ids = "";

    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    });

    var cart = req.session.cart;
    if (cart && cart.length > 0) { // Check if cart is defined and not empty
      for (let i = 0; i < cart.length; i++) {
        products_ids = products_ids + "," + cart[i].id;
      }
    }

    connection.connect((err) => {
        if (err) {
            console.log(err)
        } else {
            var query = "INSERT INTO orders(cost, name, email, status, city, address, phone, date, products_ids) VALUES ?";
            var values = [[cost || 0, name, email, status, city, address, phone, date, products_ids]];
            connection.query(query, [values], (err, result) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log("1 record inserted");
                    res.redirect('/');
                }
                connection.end();
            });
        }
    });
});
app.get('/payment', function (req, res) {
    res.render('pages/payment');
});

app.get('/about', (req, res) => {
    res.render('pages/about');
});

app.get('/contact', (req, res) => {
    res.render('pages/contact');
});

app.get('/brand', (req, res) => {
    res.render('pages/brand');
}); 

app.get('/specials', (req, res) => {
    res.render('pages/special');
});

app.get('/products', (req, res) => {
    res.render('pages/products');
});

app.post('/products', upload.single('image'), (req, res) => {
    let name = req.body.name;
    let description = req.body.description;
    let price = req.body.price;
    let sale_price = req.body.sale_price;
    let quantity = req.body.quantity;
    let image = req.file.filename;
    let category = req.body.category;
    let type = req.body.type;
    let rating = req.body.rating;
    let sql = `INSERT INTO products (name, description, price, sale_price, quantity, image, category, type , rating) VALUES ('${name}', '${description}', '${price}', '${sale_price}', '${quantity}', '${image}', '${category}', '${type}' ,'${rating}')`;
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Error inserting product: ', error);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/products');
        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
// name	description	price	sale_price	quantity	image	category	type