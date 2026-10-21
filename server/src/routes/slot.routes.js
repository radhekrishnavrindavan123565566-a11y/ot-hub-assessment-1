const router = require('express').Router();
const { createSlot, listSlots, getSlot, updateSlot, cancelSlot } = require('../controllers/slot.controller');
const { createSignup, listSignupsForSlot } = require('../controllers/signup.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSlotSchema, updateSlotSchema, listSlotsSchema } = require('../validators/slot.validators');

router.use(authenticate);

router.post('/', authorize('manager'), validate(createSlotSchema), createSlot);
router.get('/', validate(listSlotsSchema), listSlots);
router.get('/:id', getSlot);
router.patch('/:id', authorize('manager'), validate(updateSlotSchema), updateSlot);
router.post('/:id/cancel', authorize('manager'), cancelSlot);

// Signup sub-resources on slots
router.post('/:id/signups', authorize('employee'), createSignup);
router.get('/:id/signups', authorize('manager'), listSignupsForSlot);

module.exports = router;
