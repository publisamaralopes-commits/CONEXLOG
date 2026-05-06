import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);

export default router;
