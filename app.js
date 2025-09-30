const libExpress = require('express');
const libRazorpay = require('razorpay');
const libBodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
// const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = libExpress();
// app.use(cors());

// middleware to parse JSON and urlencoded data
app.use(libBodyParser.json());
app.use(libBodyParser.urlencoded({ extended: true }));

app.use(libExpress.static(path.join(__dirname, '/')));

const razorpay = new libRazorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// read data from JSON file
const readData = () => {

    if (fs.existsSync('orders.json')) {
        const data = fs.readFileSync('orders.json');
        return JSON.parse(data);
    }
    return [];
};

// write data to JSON file
const writeData = (data) => {

    fs.writeFileSync('orders.json', JSON.stringify(data, null, 2));
};


// initialize orders.json file if it doesn't exist
if (!fs.existsSync('orders.json')) {
    writeData([]);
}

// Set Content Security Policy headers

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; connect-src 'self' http://localhost:3000; script-src 'self'; style-src 'self';"
    );
    next();
});

app.get('/', (req, res) => {

    res.send('Server is running.');
});

// order creation
app.post('/create-order', async (req, res) => {

    try {
        const { amount, currency, receipt, notes } = req.body;

        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency,
            receipt,
            notes
        };

        const order = await razorpay.orders.create(options);

        // read current orders, add new order, write back to file

        const orders = readData();
        orders.push({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status,
        });

        writeData(orders);

        // send order details to frontend, including order_id
        res.json(order);
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send('Error creating order');
    }
});

// server success page
app.post('/payment-success', (req, res) => {
    res.sendFile(path.join(__dirname, '/', 'success.html'));
});


PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});