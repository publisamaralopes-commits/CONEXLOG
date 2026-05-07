import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import fleetRouter from "./fleet";
import schedulesRouter from "./schedules";
import shipmentsRouter from "./shipments";
import sysusersRouter from "./sysusers";
import lotesRouter from "./lotes";
import ocRouter from "./oc";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(fleetRouter);
router.use(schedulesRouter);
router.use(shipmentsRouter);
router.use(sysusersRouter);
router.use(lotesRouter);
router.use(ocRouter);

export default router;
