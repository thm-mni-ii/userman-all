CREATE DATABASE IF NOT EXISTS `usermanager_all` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `usermanager_all`;

CREATE TABLE `user` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `username` varchar(255) NOT NULL,
    `password` varchar(255) NOT NULL,
    `givenName` varchar(255) NOT NULL,
    `familyName` varchar(255) NOT NULL,
    `creationTime` varchar(32) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT `uq_user_username` UNIQUE (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


/*
Die Logindaten für den Nutzer lauten:
Username: admin
Password: admin
*/
INSERT INTO `user` (`id`, `username`, `password`, `givenName`, `familyName`, `creationTime`) VALUES
    (1, 'admin', '$2b$10$0OjlilEuzPnu9OxLTMdCKOHii/7aufupWcuJrElLFQkMTT5Oxh3eu', 'Peter', 'Kneisel', '24.09.2022, 12:24:59');
