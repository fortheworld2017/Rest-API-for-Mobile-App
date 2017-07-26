var dynamoose = require('dynamoose');
dynamoose.AWS.config.loadFromPath('./config.json');

var Schema = dynamoose.Schema;

var userSchema = new Schema({
    email: {
        type: String,
        required: true,
        hashKey: true
    },
    password: {
        type: String,
        required: true
    },
    user_id: {
        type: String
    },
    user_type: {
        type: String
    },
    has_account: {
        type: Boolean,
        default: false
    },
    has_bank: {
        type: Boolean,
        default: false
    }
}, {
    throughput: { read: 15, write: 5 }
});

module.exports = dynamoose.model('User', userSchema);