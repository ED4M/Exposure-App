import React, {useState, useEffect} from 'react';
import { useExpService } from '../context/expService.js';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';

const AutocompleteStaff = ( {variant, size, label, setValue, path, role, attached, value} ) => {
  const [optionList, setOptionList] = useState([]);
  const exposureService = useExpService();
  
  useEffect(() => {
    exposureService
      .getAll(path, { role, attached })
      .then(employees => setOptionList(employees))    
  }, [exposureService, role, path, attached]);


  const defaultProps = {
    options: optionList,
    getOptionLabel: (option) => option.name,
  };

  return (
    <Autocomplete
    {...defaultProps}
    value={value}
    getOptionSelected={(option, value)=> option.id === value.id}
    disableClearable
    onChange={(e, newValue) => setValue(newValue, role)}
    renderInput={(params) => <TextField {...params} label={label} variant={variant} size={size} required/>}
  />
  )
};

export default AutocompleteStaff;