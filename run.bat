@echo off

rem Unify all files into a single temp.js
rem On *nix you should use cat and | node

copy /b inc.init.js+inc.mongodb.js+inc.dashboard.js+inc.login.js+inc.users.js+inc.users_edit.js+inc.users_delete.js+inc.users_info.js+inc.weapon_categories.js+inc.weapon_types.js+inc.weapon_types_edit.js+inc.weapon_types_delete.js+inc.weapon_categories_edit.js+inc.weapon_categories_delete.js+inc.weapon_templates.js+inc.weapon_templates_edit.js+inc.weapon_templates_delete.js+inc.bugs.js+inc.bugs_edit.js+inc.bugs_info.js+inc.bugs_delete.js+inc.weapons.js+inc.weapons_edit.js+inc.weapons_delete.js+inc.weapons_info.js+inc.weapons_exam.js+inc.weapons_exam_delete.js+inc.calibers.js+inc.calibers_edit.js+inc.calibers_delete.js+inc.upload.js app.js

cls
node app.js
