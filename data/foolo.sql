CREATE DATABASE fooflo;

USE fooflo;

create table markov_chains
(
  start_link varchar(255) not null,
  end_link varchar(255) not null,
  weight int default '1' null,
  primary key (start_link, end_link)
)
  engine=InnoDB charset=utf8
;