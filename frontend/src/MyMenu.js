import * as React from 'react';
import { Menu, MenuItemLink } from 'react-admin';
import LayersIcon from '@mui/icons-material/Layers';
import PatternIcon from '@mui/icons-material/Pattern';
import RuleFolderIcon from '@mui/icons-material/RuleFolder';
import ScienceIcon from '@mui/icons-material/Science';

const MyMenu = ({ onMenuClick, dense }) => (
    <Menu onMenuClick={onMenuClick} dense={dense}>
        <MenuItemLink
            to="/files"
            primaryText="Files"
            leftIcon={<LayersIcon />}
            dense={dense}
        />
        <MenuItemLink
            to="/file-change-patterns"
            primaryText="File Change Patterns"
            leftIcon={<PatternIcon />}
            dense={dense}
        />
        <MenuItemLink
            to="/exclusion-patterns"
            primaryText="Exclusion Patterns"
            leftIcon={<RuleFolderIcon />}
            dense={dense}
        />
        <MenuItemLink
            to="/pattern-tester"
            primaryText="Pattern Tester"
            leftIcon={<ScienceIcon />}
            dense={dense}
        />
    </Menu>
);

export default MyMenu;
