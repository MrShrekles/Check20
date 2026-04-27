@echo off
set SRC=C:\Users\Shrek\Dropbox\TTRPG\CODEMONKEY\Rulebook Project
set DEST=C:\Users\Shrek\Dropbox\TTRPG\CODEMONKEY\Rulebook Project Clone\Check20

robocopy "%SRC%" "%DEST%" /MIR ^
    /XD "%SRC%\shek-forge" "%SRC%\data\.backups" "%SRC%\node_modules" ".git" ^
    /XF "*.psd" ^
    /NFL /NDL /NJH /NJS

robocopy "%SRC%\shek-forge\Roll20" "%DEST%\downloads\roll20" /MIR ^
    /NFL /NDL /NJH /NJS

echo.
echo Deploy complete.
pause
