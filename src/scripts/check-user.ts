import db from '../config/database';
import { User } from '../models';

const check = async () => {
    try {
        const email = 'adm.peskinproid@gmail.com';
        const user = await User.findOne({ where: { email } });
        
        if (user) {
            console.log('🔍 User Found:');
            console.log('   Email:', user.email);
            console.log('   Role:', user.role);
            console.log('   Status:', user.status);
            console.log('   ID:', user.id);
        } else {
            console.log('❌ User not found!');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
