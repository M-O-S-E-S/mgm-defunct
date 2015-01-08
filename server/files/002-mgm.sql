#allow for null regions for the default values
ALTER TABLE  `iniConfig` CHANGE  `region`  `region` VARCHAR( 256 ) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL ;

#convert region names to uuids
UPDATE `iniConfig`, `regions` SET `iniConfig`.`region` = `regions`.`uuid` WHERE `iniConfig`.`region` = `regions`.`name`;

#change default settings to uuid NULL instead of name default
UPDATE `iniConfig` SET `region` = NULL WHERE `region` = "default";

#region column in table now contains NULL or UUID, shorten data field
ALTER TABLE  `iniConfig` CHANGE  `region`  `region` CHAR( 36 ) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL ;

INSERT IGNORE INTO `mgmDb` (`version`, `description`) VALUES (2, '002-mgm.sql');