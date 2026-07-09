import { Router } from 'express'
import { authenticate } from '@middleware/authenticate'
import { listOwners, createOwner, updateOwner } from '@controllers/OwnerController'

const router = Router()
router.use(authenticate)

router.get('/', listOwners)
router.post('/', createOwner)
router.patch('/:id', updateOwner)

export default router
