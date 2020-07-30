import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';

import AdaptationPlanCard from '../components/PlanDetails/AdaptationPlanCard.js';
import TasksBlock from '../components/TaskBlock/TasksBlock.js';
import CommentBlock from '../components/CommentBlock/CommentBlock.js';
import SendButton from '../components/PlanDetails/SendButton.js';
import { useExpService } from '../context/expService.js';
import { useAuth } from '../context/auth.js';
import role from '../utils/role.js';
import loaderHoc from '../reusable/HocLoader.js';
import ErrorBoundary from '../reusable/ErrorBoundary.js';


import { Grid, makeStyles, Box, IconButton, Typography } from '@material-ui/core';
import KeyboardBackspaceIcon from '@material-ui/icons/KeyboardBackspace';


const useStyles = makeStyles(theme => ({
  sendButtonsBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2)
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(1)
  },
}));

const PlanDetailsPage = () => {
  const expService = useExpService();
  const [planId] = useState(useParams().id);
  const [plan, setPlan] = useState(null);
  const user = useAuth();
  const history = useHistory();
  const classes = useStyles();

  useEffect(() => {
    expService
      .get('plan', planId)
      .then(plan => setPlan(plan));
  }, [expService, planId]);

  const getSendButtonText = (stage, direction) => {
    const maps = {
      0: 'На заполнение',
      1: 'На согласование',
      2: 'На выполнение',
      3: 'На оценку',
      4: 'Завершить оценку'
    };

    const buttonText = (direction === 'backward')
      ? (`${maps[stage - 1]}`)
      : (`${maps[stage + 1]}`);

    return buttonText;
  };

  const handleForwardClick = async () => {
    const newPlan = {
      ...plan,
      employeePosition: plan.employeePosition.id,
      hr: plan.hr.id,
      employee: plan.employee.id,
      supervisor: plan.supervisor.id,
      stage: ++plan.stage
    };
    const updatedPlan = await expService.update('plan', planId, newPlan);
    setPlan(updatedPlan);
  };

  const handleBackwardClick = async () => {
    const newPlan = {
      ...plan,
      employeePosition: plan.employeePosition.id,
      hr: plan.hr.id,
      employee: plan.employee.id,
      supervisor: plan.supervisor.id,
      stage: --plan.stage
    };
    const updatedPlan = await expService.update('plan', planId, newPlan);
    setPlan(updatedPlan);
  };

  const allowedToForward = () => {
    const permissions = {
      [role.employee]: [1, 0, 1, 0, 0],
      [role.supervisor]: [0, 1, 1, 1, 0],
      [role.hr]: [1, 1, 1, 1, 0],
    };
    return Boolean(permissions[user.role][plan.stage])
  };

  const allowedToBackward = () => {
    const permissions = {
      [role.employee]: [0, 0, 0, 0, 0],
      [role.supervisor]: [0, 1, 0, 1, 0],
      [role.hr]: [0, 1, 1, 1, 1],
    };
    return Boolean(permissions[user.role][plan.stage])
  };

  const AdapPlan = loaderHoc(
    AdaptationPlanCard,
    plan
  );

  const handleBackIconClick = () => {
    history.replace('/plans/');
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Box className={classes.cardHeader}>
            <IconButton size='small' edge='end' color="inherit" onClick={handleBackIconClick}>
              <KeyboardBackspaceIcon />
            </IconButton>
            <Typography variant='h5'>
              Адаптационный план
            </Typography>
          </Box>
          <AdapPlan setDisplayPlan={setPlan} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <ErrorBoundary>
            {plan &&
              <TasksBlock planObj={plan} />}
          </ErrorBoundary>
        </Grid>
        <Grid item xs={12} sm={6}>
          <ErrorBoundary>
            <CommentBlock planId={planId} />
          </ErrorBoundary>
        </Grid>
      </Grid>
      {plan &&
        <Box className={classes.sendButtonsBox}>
          {allowedToBackward()
            ? <SendButton
              type='backward'
              handler={handleBackwardClick}
              text={getSendButtonText(plan.stage, 'backward')} />
            : null}
          {allowedToForward()
            ? <SendButton
              type='forward'
              handler={handleForwardClick}
              text={getSendButtonText(plan.stage, 'forward')} />
            : null}
        </Box>}
    </>
  );
};

export default PlanDetailsPage;