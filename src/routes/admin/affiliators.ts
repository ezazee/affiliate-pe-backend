import express from 'express';
import { User } from '../../models';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @swagger
 * /admin/affiliators:
 *   get:
 *     summary: Ambil semua afiliator
 *     tags: [Admin]
 */
router.get('/', async (req, res) => {
    try {
        const affiliators = await User.findAll({ where: { role: 'affiliator' } });
        return res.json(affiliators);
    } catch (error) {
        console.error('Error fetching affiliators:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/affiliators/{id}:
 *   delete:
 *     summary: Hapus afiliator (Admin)
 *     tags: [Admin]
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const affiliator = await User.findOne({
            where: {
                [Op.or]: [{ id }, { _id: id }],
                role: 'affiliator'
            }
        });

        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        await affiliator.destroy();
        return res.json({ message: 'Affiliator deleted successfully' });

    } catch (error) {
        console.error('Error deleting affiliator:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/affiliators/{id}:
 *   put:
 *     summary: Update status afiliator (Admin)
 *     tags: [Admin]
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, name, email, phone } = req.body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const affiliator = await User.findOne({
            where: {
                [Op.or]: [{ id }, { _id: id }],
                role: 'affiliator'
            }
        });

        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        await affiliator.update(updateData);

        return res.json(affiliator);

    } catch (error) {
        console.error('Error updating affiliator:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
