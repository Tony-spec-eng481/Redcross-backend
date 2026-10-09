import express from 'express';
import {
  getDisseminationItems,
  getDisseminationItem,
} from '../controllers/adminController.js';

const router = express.Router();

// Public & Member Portal Dissemination Routes
router.get('/', getDisseminationItems);
router.get('/:id', getDisseminationItem);

export default router;
