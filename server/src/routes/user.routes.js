const router = require('express').Router();
const { createUser, listUsers, updateOtCap } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateOtCapSchema, listUsersSchema } = require('../validators/user.validators');

router.use(authenticate);

router.post('/', authorize('admin'), validate(createUserSchema), createUser);
router.get('/', authorize('admin', 'manager'), validate(listUsersSchema), listUsers);
router.patch('/:id/ot-cap', authorize('admin'), validate(updateOtCapSchema), updateOtCap);

module.exports = router;
