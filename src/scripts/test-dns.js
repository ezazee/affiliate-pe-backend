const dns = require('dns');

const hosts = ['google.com', 'github.com', 'cluster0.hkfrbpr.mongodb.net'];

console.log('🔍 Starting Network/DNS Diagnostics...');

hosts.forEach(host => {
    dns.lookup(host, (err, address, family) => {
        if (err) {
            console.error(`❌ FAILED to resolve ${host}: ${err.message}`);
        } else {
            console.log(`✅ SUCCESS resolving ${host}: ${address}`);
        }
    });
});
